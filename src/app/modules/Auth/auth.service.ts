import dotenv from "dotenv";
dotenv.config();

import jwt, { JwtPayload, SignOptions, Secret } from "jsonwebtoken";
import { Request } from "express";
import crypto from "crypto";
import ApiError from "../../utils/apiError";
import User from "./user.model";
import { IUser } from "./user.interface";
import { uploadToCloudinary } from "../../utils/cloudinary.util";
import { sendPasswordResetEmail, sendResetSuccessEmail } from "./email.service";
import {
  sendWelcomeVerificationEmail,
  sendVerificationSuccessEmail,
  generateRandomPassword,
} from "./email.service";
// ----- JWT config (typed) -----

const JWT_SECRET_ENV = process.env.JWT_SECRET;
if (!JWT_SECRET_ENV) {
  throw new Error("JWT_SECRET is not defined");
}
const JWT_SECRET: Secret = JWT_SECRET_ENV; // TypeScript now knows JWT_SECRET_ENV is string
const JWT_EXPIRES_IN: SignOptions["expiresIn"] =
  (process.env.JWT_EXPIRES_IN as unknown as SignOptions["expiresIn"]) ?? "15m";

// Helper to build backend link (no FRONTEND_URL)
const BASE_URL =
  process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;

// ----- helpers -----
export const signToken = (id: string): string =>
  jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

export const createSendToken = (
  user: IUser,
  statusCode: number,
  _req: Request,
  res: any
) => {
  const token = signToken(user._id.toString());
  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
};

// ----- auth flows -----
export const signup = async (
  name: string,
  email: string,
  password: string,
  passwordConfirm: string,
  photo?: Express.Multer.File
) => {
  if (password !== passwordConfirm)
    throw new ApiError("Passwords do not match", 400);

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new ApiError("Email already in use", 400);

  let photoUrl: string | undefined;
  if (photo) {
    photoUrl = await uploadToCloudinary(photo);
  }

  const newUser = await User.create({
    name,
    email,
    password,
    role: "user",
    photo: photoUrl,
  });

  return newUser;
};

export const login = async (email: string, password: string) => {
  if (!email || !password)
    throw new ApiError("Please provide email and password", 400);

  const user = await User.findOne({ email }).select(
    "+password +refreshTokenHash +refreshTokenExpiresAt"
  );
  if (!user || !user.password)
    throw new ApiError("Incorrect email or password", 401);

  const ok = await user.correctPassword(password, user.password);
  if (!ok) throw new ApiError("Incorrect email or password", 401);

  return user;
};

// --- FORGOT PASSWORD ---
export const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    // For security, don't reveal if email exists
    console.log(`Password reset requested for non-existent email: ${email}`);
    return; // Silent success for security
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // Create BACKEND URL for password reset
  const resetURL = `${process.env.API_PUBLIC_URL}/api/v1/auth/reset-password/${resetToken}`;

  try {
    await sendPasswordResetEmail(
      user.email,
      (user as any).name || "Customer",
      resetURL
    );

    console.log(`Password reset email sent to: ${user.email}`);
    return resetToken;
  } catch (error: any) {
    console.error("Email sending error:", error);

    // Reset the token since email failed
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    throw new ApiError(
      "There was an error sending the email. Try again later!",
      500
    );
  }
};

// --- RESET PASSWORD ---
export const resetPassword = async (
  token: string,
  password: string,
  passwordConfirm: string
) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) throw new ApiError("Token is invalid or has expired", 400);
  if (password !== passwordConfirm)
    throw new ApiError("Passwords do not match", 400);

  // Set new password
  user.password = password;

  // Invalidate refresh and bump passwordChangedAt (avoid iat race)
  user.refreshTokenHash = undefined as any;
  user.refreshTokenExpiresAt = undefined as any;
  (user as any).passwordChangedAt = new Date(Date.now() - 1000);

  // Clear reset fields
  user.passwordResetToken = undefined as any;
  user.passwordResetExpires = undefined as any;

  await user.save();

  // Fire-and-forget confirmation
  sendResetSuccessEmail(user.email, (user as any).name || "there").catch(
    () => {}
  );

  return user;
};

// --- UPDATE PASSWORD (while logged in) ---
export const updatePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
  newPasswordConfirm: string
) => {
  const user = await User.findById(userId).select(
    "+password +refreshTokenHash +refreshTokenExpiresAt"
  );
  if (!user) throw new ApiError("User not found", 404);
  if (!user.password) throw new ApiError("User has no password set", 400);

  const ok = await user.correctPassword(currentPassword, user.password);
  if (!ok) throw new ApiError("Your current password is wrong.", 401);

  if (newPassword !== newPasswordConfirm)
    throw new ApiError("Passwords do not match", 400);

  user.password = newPassword;
  user.refreshTokenHash = undefined as any;
  user.refreshTokenExpiresAt = undefined as any;
  (user as any).passwordChangedAt = new Date(Date.now() - 1000);

  await user.save();
  return user;
};

// --- PROTECT ---
export const protect = async (token: string): Promise<IUser> => {
  if (!token)
    throw new ApiError(
      "You are not logged in! Please log in to get access.",
      401
    );

  type Decoded = JwtPayload & { id: string; iat: number };
  let decoded: Decoded;

  try {
    decoded = jwt.verify(token, JWT_SECRET) as Decoded;
  } catch {
    throw new ApiError("Invalid token. Please log in again!", 401);
  }

  if (
    !decoded ||
    typeof decoded !== "object" ||
    !decoded.id ||
    typeof decoded.iat !== "number"
  ) {
    throw new ApiError("Invalid token payload.", 401);
  }

  const currentUser = await User.findById(decoded.id).select("+role");
  if (!currentUser)
    throw new ApiError(
      "The user belonging to this token does no longer exist.",
      401
    );

  if ((currentUser as any).active === false) {
    throw new ApiError("Account is deactivated.", 401);
  }

  if ((currentUser as any).changedPasswordAfter(decoded.iat)) {
    throw new ApiError(" Please log in again.", 401);
  }

  // (Optional) If you added lastLogoutAt: reject tokens issued before logout
  // if ((currentUser as any).lastLogoutAt) {
  //   const lastOutMs = new Date((currentUser as any).lastLogoutAt).getTime();
  //   if (decoded.iat * 1000 < lastOutMs) {
  //      new throw new ApiError("Session ended. Please log in again.", 401);
  //   }
  // }

  return currentUser as unknown as IUser;
};

// ... existing code remains ...

// NEW FUNCTION: Email verification registration
// In auth.service.ts - UPDATE the registerWithEmailVerification function:
export const registerWithEmailVerification = async (
  name: string,
  email: string,
  password?: string, // Make password optional
  photo?: Express.Multer.File
): Promise<{ user: IUser; temporaryPassword?: string }> => {
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError("Email already registered", 400);
  }

  // If password provided, use it. Otherwise generate temporary one
  let userPassword: string;
  let temporaryPassword: string | undefined;

  if (password && password.trim().length >= 6) {
    userPassword = password;
  } else {
    temporaryPassword = generateRandomPassword();
    userPassword = temporaryPassword;
  }

  // Create user
  let photoUrl: string | undefined;
  if (photo) {
    photoUrl = await uploadToCloudinary(photo);
  }

  const newUser = await User.create({
    name,
    email,
    password: userPassword,
    role: "user",
    photo: photoUrl,
    isEmailVerified: false,
    verificationAttempts: 0,
    active: false, // Not active until verified
  });

  // Generate email verification token
  const verificationToken = (newUser as any).createEmailVerificationToken();
  await newUser.save({ validateBeforeSave: false });

  // Send verification email
  const verificationLink = `${process.env.API_PUBLIC_URL}/api/v1/auth/verify-email/${verificationToken}`;

  await sendWelcomeVerificationEmail(
    email,
    name,
    verificationLink,
    temporaryPassword || "Use the password you set during registration"
  );

  return {
    user: newUser,
    temporaryPassword: temporaryPassword,
  };
};

// NEW FUNCTION: Verify email token
// In auth.service.ts - REPLACE the verifyEmailToken function:
export const verifyEmailToken = async (token: string): Promise<IUser> => {
  console.log("Verifying token:", token); // Debug log

  if (!token || token.trim().length === 0) {
    throw new ApiError("Verification token is required", 400);
  }

  try {
    // Hash the token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    console.log("Hashed token:", hashedToken); // Debug log

    // Find user with valid verification token
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    console.log("Found user:", user ? user.email : "No user found"); // Debug log

    if (!user) {
      // Try to find if token expired
      const expiredUser = await User.findOne({
        emailVerificationToken: hashedToken,
      });

      if (expiredUser) {
        throw new ApiError(
          "Verification link has expired. Please request a new one.",
          400
        );
      }
      throw new ApiError("Invalid verification token", 400);
    }

    // Check if already verified
    if (user.isEmailVerified) {
      throw new ApiError("Email is already verified", 400);
    }

    // Update user
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined as any;
    user.emailVerificationExpires = undefined as any;
    user.verificationAttempts = 0;
    user.active = true;

    await user.save();

    // Send success email
    sendVerificationSuccessEmail(user.email, user.name).catch(console.error);

    return user;
  } catch (error: any) {
    console.error("Token verification error:", error.message);
    throw error;
  }
};

// NEW FUNCTION: Resend verification email
// In auth.service.ts - UPDATE the resendVerificationEmail function:
export const resendVerificationEmail = async (email: string): Promise<void> => {
  const user = await User.findOne({ email });

  if (!user) {
    // For security, don't reveal if user exists
    console.log(
      `Resend verification requested for non-existent email: ${email}`
    );
    return;
  }

  // If already verified, throw error
  if (user.isEmailVerified) {
    throw new ApiError(
      "Email is already verified. You can login directly.",
      400
    );
  }

  // Check rate limiting
  const now = new Date();
  if (user.lastVerificationAttempt && user.verificationAttempts >= 5) {
    const timeDiff = now.getTime() - user.lastVerificationAttempt.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff < 24) {
      throw new ApiError(
        "Too many verification requests. Please try again tomorrow.",
        429
      );
    } else {
      // Reset attempts if more than 24 hours passed
      user.verificationAttempts = 0;
    }
  }

  // Generate new verification token
  const verificationToken = (user as any).createEmailVerificationToken();
  user.verificationAttempts += 1;
  user.lastVerificationAttempt = now;
  await user.save({ validateBeforeSave: false });

  // Send verification email
  const verificationLink = `${process.env.API_PUBMENT_URL}/api/v1/auth/verify-email/${verificationToken}`;

  await sendWelcomeVerificationEmail(
    user.email,
    user.name,
    verificationLink,
    "Use your existing password to login"
  );
};
