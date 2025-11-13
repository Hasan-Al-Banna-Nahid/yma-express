import dotenv from "dotenv";
dotenv.config();

import jwt, { JwtPayload, SignOptions, Secret } from "jsonwebtoken";
import { Request } from "express";
import crypto from "crypto";
import ApiError from "../utils/apiError";
import User from "../models/user.model";
import { IUser } from "../interfaces/user.interface";
import { uploadToCloudinary } from "../utils/cloudinary.util";
import { sendPasswordResetEmail, sendResetSuccessEmail } from "./email.service";

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
// In auth.service.ts - forgotPassword function
export const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal that email doesn't exist (security)
    console.log(`Password reset requested for non-existent email: ${email}`);
    return; // Silent success for security
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.BASE_URL}/auth/reset-password/${resetToken}`;

  try {
    await sendPasswordResetEmail(
      user.email,
      (user as any).name || "there",
      resetURL
    );
    console.log(`Password reset email sent to: ${user.email}`);
    return resetToken;
  } catch (err: any) {
    console.error("🔴 SendGrid Email Error Details:", {
      message: err.message,
      code: err.code,
      response: err.response?.body,
      stack: err.stack,
    });

    // Reset the token since email failed
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // More specific error messages
    if (err.code === 401 || err.response?.statusCode === 401) {
      throw new ApiError(
        "Email service configuration error. Please contact support.",
        500
      );
    } else if (err.code === 403) {
      throw new ApiError(
        "Email sending permission denied. Please contact support.",
        500
      );
    } else {
      throw new ApiError(
        "There was an error sending the email. Try again later!",
        500
      );
    }
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
