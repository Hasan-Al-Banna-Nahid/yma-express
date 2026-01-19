import dotenv from "dotenv";
dotenv.config();

import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  registerWithEmailVerification,
  verifyEmailToken,
  resendVerificationEmail,
} from "./auth.service";

import { IUser } from "./user.interface";
import User from "./user.model";

import {
  forgotPassword,
  login,
  resetPassword,
  signup,
  updatePassword,
  protect as verifyAccessTokenService,
} from "./auth.service";

import ApiError from "../../utils/apiError";
import { ApiResponse } from "../../utils/apiResponse";
import asyncHandler from "../../utils/asyncHandler";
import { hashToken, issueTokens, sanitizeUser } from "../../utils/auth.util";
import { uploadToCloudinary } from "../../utils/cloudinary.util";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware"; // Import AuthenticatedRequest

// ---------------- cookies helpers ----------------
export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
) => {
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProd, // ❗ important
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 60 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });
};

// ---------------- public: register ----------------
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, passwordConfirm } = req.body;
  const photo = req.file;

  const user = await signup(name, email, password, passwordConfirm, photo);
  const { accessToken, refreshToken } = await issueTokens(user);
  setAuthCookies(res, accessToken, refreshToken);
  ApiResponse(res, 201, "User registered successfully", {
    user: sanitizeUser(user),
    tokens: { accessToken, refreshToken },
  });
});

// ---------------- public: login ----------------
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Always validate credentials on /login (no refresh-rotate here)
  const user = await login(email, password);
  const { accessToken, refreshToken } = await issueTokens(user);
  setAuthCookies(res, accessToken, refreshToken);

  ApiResponse(res, 200, "Logged in successfully", {
    user: sanitizeUser(user),
    tokens: { accessToken, refreshToken },
  });
});

// ---------------- public: refresh ----------------

// ---------------- public: refresh token ----------------
export const refreshTokenHandler = asyncHandler(
  async (req: Request, res: Response) => {
    // Get refresh token from cookie or body
    const token =
      (req.cookies?.refreshToken as string | undefined) ||
      req.body?.refreshToken;

    if (!token) throw new ApiError("Refresh token required", 401);

    // Verify JWT structure first
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as any;
    } catch (err) {
      throw new ApiError("Invalid or expired refresh token", 401);
    }

    // Find user with hashed token
    const user = await User.findById(payload.id).select(
      "+refreshTokenHash +refreshTokenExpiresAt",
    );
    if (!user) throw new ApiError("User not found", 401);

    // Validate token hash & expiry
    const matches = user.refreshTokenHash === hashToken(token);
    const notExpired =
      !user.refreshTokenExpiresAt || user.refreshTokenExpiresAt > new Date();

    if (!matches || !notExpired)
      throw new ApiError("Invalid or expired refresh token", 401);

    // Issue new tokens (rotation)
    const rotated = await issueTokens(user);

    // Set cookies
    res.cookie("accessToken", rotated.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60 * 1000, // 1h
    });
    res.cookie("refreshToken", rotated.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
    });

    // Return response
    ApiResponse(res, 200, "Token refreshed successfully", {
      user: sanitizeUser(user),
      tokens: rotated,
    });
  },
);

// ---------------- public: forgot password ----------------
export const forgotPasswordHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      throw new ApiError("Email is required", 400);
    }

    try {
      await forgotPassword(email);

      // Success response with user-friendly message
      ApiResponse(
        res,
        200,
        "If your email exists, a password reset link has been sent",
        {
          message: "Check your email for reset instructions",
          note: "If you don't see the email, check your spam folder",
          expiresIn: "10 minutes",
        },
      );
    } catch (error: any) {
      // Still return success for security (don't reveal if email exists)
      console.error("Forgot password error:", error.message);

      ApiResponse(
        res,
        200,
        "If your email exists, a password reset link has been sent",
        {
          message: "Check your email for reset instructions",
          note: "If you don't see the email, check your spam folder",
          expiresIn: "10 minutes",
        },
      );
    }
  },
);
// In auth.controller.ts - add this function
export const verifyResetToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = req.params;

    if (!token) {
      throw new ApiError("Reset token is required", 400);
    }

    // Hash the token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new ApiError("Reset token is invalid or has expired", 400);
    }

    // Token is valid - return success with redirect URL
    ApiResponse(res, 200, "Token is valid", {
      valid: true,
      token,
      email: user.email,
      name: user.name,
      redirectTo: `${
        process.env.FRONTEND_URL
      }/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`,
      expiresIn: user.passwordResetExpires
        ? Math.floor((user.passwordResetExpires.getTime() - Date.now()) / 60000)
        : 0, // minutes remaining
    });
  },
);
// In auth.controller.ts - create this function
// Add this function to your auth.controller.ts
export const renderResetPage = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = req.params;

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Reset Link</title>
        </head>
        <body>
          <h1>❌ Invalid Reset Link</h1>
        </body>
        </html>
      `);
    }

    // Verify token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Expired Reset Link</title>
        </head>
        <body>
          <h1>⏰ Reset Link Expired</h1>
        </body>
        </html>
      `);
    }

    // SIMPLE WORKING FORM WITH LOGO
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password - YMA Bouncy Castle</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
            text-align: center;
          }
          
          .logo {
            max-width: 150px;
            margin: 0 auto 20px;
            display: block;
          }
          
          h1 {
            color: #333;
            margin-bottom: 20px;
            font-size: 24px;
          }
          
          input {
            width: 100%;
            padding: 12px;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 5px;
            box-sizing: border-box;
            font-size: 16px;
          }
          
          button {
            width: 100%;
            padding: 14px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 10px;
          }
          
          button:hover {
            background: #45a049;
          }
          
          button:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
          
          .error {
            color: #ff0000;
            font-size: 14px;
            margin: 5px 0;
            text-align: left;
          }
          
          .success {
            color: #4CAF50;
            font-size: 14px;
            margin: 10px 0;
          }
          
          .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
            margin-right: 10px;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- YMA LOGO -->
          <img src="https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png" 
               alt="YMA Bouncy Castle" 
               class="logo">
          
          <h1>Reset Your Password</h1>
          
          <div id="errorMessage" class="error" style="display: none;"></div>
          <div id="successMessage" class="success" style="display: none;"></div>
          
          <form id="resetForm">
            <input type="hidden" id="token" value="${token}">
            <input type="hidden" id="email" value="${user.email}">
            
            <div>
              <input type="password" 
                     id="password" 
                     placeholder="New Password" 
                     required 
                     minlength="6">
              <div id="passwordError" class="error"></div>
            </div>
            
            <div>
              <input type="password" 
                     id="confirmPassword" 
                     placeholder="Confirm Password" 
                     required 
                     minlength="6">
              <div id="confirmError" class="error"></div>
            </div>
            
            <button type="submit" id="submitBtn">
              Reset Password
            </button>
          </form>
        </div>

        <script>
          // Get elements
          const form = document.getElementById('resetForm');
          const passwordInput = document.getElementById('password');
          const confirmInput = document.getElementById('confirmPassword');
          const submitBtn = document.getElementById('submitBtn');
          const errorMessage = document.getElementById('errorMessage');
          const successMessage = document.getElementById('successMessage');
          const passwordError = document.getElementById('passwordError');
          const confirmError = document.getElementById('confirmError');
          
          // Simple validation - enable button when both fields have values
          function validateForm() {
            const password = passwordInput.value;
            const confirm = confirmInput.value;
            
            // Clear previous errors
            passwordError.textContent = '';
            confirmError.textContent = '';
            
            let isValid = true;
            
            // Check password length
            if (password.length < 6) {
              passwordError.textContent = 'Password must be at least 6 characters';
              isValid = false;
            }
            
            // Check if passwords match
            if (password !== confirm) {
              confirmError.textContent = 'Passwords do not match';
              isValid = false;
            }
            
            // Enable/disable button
            submitBtn.disabled = !isValid;
            
            return isValid;
          }
          
          // Real-time validation
          passwordInput.addEventListener('input', validateForm);
          confirmInput.addEventListener('input', validateForm);
          
          // Form submission
          form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validate before submitting
            if (!validateForm()) {
              return;
            }
            
            const token = document.getElementById('token').value;
            const email = document.getElementById('email').value;
            const password = passwordInput.value;
            
            // Disable button and show loading
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading"></span> Processing...';
            
            try {
              // Send request to SAME SERVER - no CORS issue
              const response = await fetch('/api/v1/auth/reset-password', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  token,
                  email,
                  password,
                  passwordConfirm: password  // Use same password for confirmation
                })
              });
              
              const data = await response.json();
              
              if (response.ok) {
                // Success
                successMessage.textContent = '✅ Password reset successfully!';
                successMessage.style.display = 'block';
                form.style.display = 'none';
                
                // Redirect after 3 seconds
                setTimeout(() => {
                  window.location.href = '/login';
                }, 3000);
              } else {
                // Show error
                errorMessage.textContent = '❌ ' + (data.message || 'Reset failed');
                errorMessage.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Reset Password';
              }
            } catch (error) {
              console.error('Error:', error);
              errorMessage.textContent = '❌ Network error. Please try again.';
              errorMessage.style.display = 'block';
              submitBtn.disabled = false;
              submitBtn.innerHTML = 'Reset Password';
            }
          });
          
          // Initial validation
          validateForm();
        </script>
      </body>
      </html>
    `;

    res.send(html);
  },
);
// ---------------- public: render reset page ----------------
export async function renderResetPasswordPage(req: Request, res: Response) {
  const { token } = req.params;
  if (!token) return res.status(400).send("Missing token.");

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).render("auth/resetForm.ejs", {
      title: "Password reset",
      token: null,
      error: "This reset link is invalid or has expired.",
    });
  }

  return res.status(200).render("auth/resetForm", {
    title: "Password reset",
    token,
    error: null,
  });
}

// ---------------- public: handle reset submit ----------------
// In auth.controller.ts - resetPasswordHandler
export const resetPasswordHandler = asyncHandler(
  async (req: Request, res: Response) => {
    // Accept token from URL params OR request body
    const token = req.params.token || req.body.token;
    const { password, passwordConfirm, email } = req.body;

    // Validation
    if (!token) {
      throw new ApiError("Reset token is required", 400);
    }

    if (!password || !passwordConfirm) {
      throw new ApiError("Password and confirmation are required", 400);
    }

    if (password !== passwordConfirm) {
      throw new ApiError("Passwords do not match", 400);
    }

    if (password.length < 8) {
      throw new ApiError("Password must be at least 8 characters", 400);
    }

    const user = await resetPassword(token, password, passwordConfirm);

    // Check if request is from HTML form (web) or API
    const acceptsHtml = req.accepts("html");
    const isJson = req.accepts("json");

    if (acceptsHtml && !isJson) {
      // Return HTML success page
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Password Reset Successful</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: linear-gradient(135deg, #f5f7fa, #e3f2fd); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
            .success-container { background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); padding: 40px; max-width: 500px; }
            .success-icon { font-size: 60px; color: #27AE60; margin-bottom: 20px; }
            h1 { color: #27AE60; margin-bottom: 20px; }
            .message { color: #666; margin-bottom: 30px; font-size: 16px; line-height: 1.6; }
            .button { 
              background: #27AE60; color: white; padding: 14px 32px; 
              text-decoration: none; border-radius: 6px; display: inline-block; 
              font-weight: 600; font-size: 16px; transition: background 0.3s;
            }
            .button:hover { background: #219653; }
          </style>
          <script>
            setTimeout(() => {
              window.location.href = '${process.env.FRONTEND_URL}/login?reset=success';
            }, 5000);
          </script>
        </head>
        <body>
          <div class="success-container">
            <div class="success-icon">✅</div>
            <h1>Password Reset Successful!</h1>
            <div class="message">
              Your password has been reset successfully.<br>
              You will be redirected to the login page in 5 seconds.
            </div>
            <a href="${process.env.FRONTEND_URL}/login?reset=success" class="button">
              Go to Login
            </a>
          </div>
        </body>
        </html>
      `);
    }

    // For API requests, return JSON
    ApiResponse(res, 200, "Password reset successful", {
      success: true,
      message: "Your password has been reset successfully",
      user: {
        email: user.email,
        name: user.name,
      },
      redirectTo: `${process.env.FRONTEND_URL}/login?reset=success`,
      timestamp: new Date().toISOString(),
    });
  },
);

// ---------------- protected: update password ----------------
export const updatePasswordHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const aReq = req as AuthenticatedRequest;
    if (!aReq.user?.id) throw new ApiError("User not authenticated", 401);

    const { currentPassword, newPassword, newPasswordConfirm } = req.body;
    const user = await updatePassword(
      aReq.user.id,
      currentPassword,
      newPassword,
      newPasswordConfirm,
    );

    // Invalidate old refresh and rotate
    user.refreshTokenHash = undefined as any;
    user.refreshTokenExpiresAt = undefined as any;
    await user.save({ validateBeforeSave: false });

    const rotated = await issueTokens(user);
    setAuthCookies(res, rotated.accessToken, rotated.refreshToken);

    ApiResponse(res, 200, "Password updated successfully", {
      user: sanitizeUser(user),
      tokens: rotated,
    });
  },
);

// ---------------- protected: me ----------------
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const aReq = req as AuthenticatedRequest;
  if (!aReq.user) throw new ApiError("User not authenticated", 401);

  const user = await User.findById(aReq.user.id);
  ApiResponse(res, 200, "User retrieved successfully", {
    user: sanitizeUser(user),
  });
});

// ---------------- protected: update me ----------------
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const aReq = req as AuthenticatedRequest;
  if (!aReq.user) throw new ApiError("User not authenticated", 401);

  const { name, email, currentPassword, newPassword, newPasswordConfirm } =
    req.body as {
      name?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
      newPasswordConfirm?: string;
    };

  const file = req.file;
  let photoUrl: string | undefined;
  if (file) {
    photoUrl = await uploadToCloudinary(file);
    const ts = Date.now();
    photoUrl = `${photoUrl}${photoUrl?.includes("?") ? "&" : "?"}t=${ts}`;
  }

  const profileUpdate: Record<string, any> = {};
  if (typeof name !== "undefined") profileUpdate.name = name;

  if (typeof email !== "undefined") {
    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: aReq.user.id },
    });
    if (exists) throw new ApiError("Email already in use", 400);
    profileUpdate.email = normalizedEmail;
  }

  if (typeof photoUrl !== "undefined") {
    profileUpdate.photo = photoUrl;
  }

  let userDoc = await User.findById(aReq.user.id).select(
    "+password +refreshTokenHash +refreshTokenExpiresAt",
  );
  if (!userDoc) throw new ApiError("User not found", 404);

  Object.assign(userDoc, profileUpdate);

  let rotatedTokens: { accessToken: string; refreshToken: string } | undefined;

  const wantsPasswordChange =
    typeof currentPassword !== "undefined" ||
    typeof newPassword !== "undefined" ||
    typeof newPasswordConfirm !== "undefined";

  if (wantsPasswordChange) {
    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      throw new ApiError(
        "To change password, provide currentPassword, newPassword and newPasswordConfirm.",
        400,
      );
    }

    if (!userDoc.password) throw new ApiError("User has no password set", 400);

    const ok = await userDoc.correctPassword(currentPassword, userDoc.password);
    if (!ok) throw new ApiError("Your current password is wrong.", 401);

    if (newPassword !== newPasswordConfirm)
      throw new ApiError("Passwords do not match", 400);

    userDoc.password = newPassword;
    userDoc.refreshTokenHash = undefined as any;
    userDoc.refreshTokenExpiresAt = undefined as any;
    (userDoc as any).passwordChangedAt = new Date(Date.now() - 1000);

    await userDoc.save();

    rotatedTokens = await issueTokens(userDoc);
    setAuthCookies(res, rotatedTokens.accessToken, rotatedTokens.refreshToken);
  } else {
    if (Object.keys(profileUpdate).length > 0) {
      await userDoc.save({ validateModifiedOnly: true });
    }
  }

  const safe = sanitizeUser(userDoc);
  ApiResponse(res, 200, "User updated successfully", {
    user: safe,
    ...(rotatedTokens ? { tokens: rotatedTokens } : {}),
  });
});

export const protectRoute = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const cookieToken = (req as any).cookies?.accessToken as string | undefined;
    const headerToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : undefined;

    let tokenToUse: string | undefined = cookieToken || headerToken;

    // If both exist (common when the client sends an old header token), choose the newer by iat
    if (cookieToken && headerToken && headerToken !== cookieToken) {
      const ciat = (jwt.decode(cookieToken) as any)?.iat ?? 0;
      const hiat = (jwt.decode(headerToken) as any)?.iat ?? 0;
      tokenToUse = ciat >= hiat ? cookieToken : headerToken;
    }

    if (!tokenToUse) throw new ApiError("No token provided", 401);

    const currentUser = await verifyAccessTokenService(tokenToUse);
    (req as AuthenticatedRequest).user = currentUser;
    next();
  },
);

/* =========================
   REGISTER WITH EMAIL VERIFICATION
========================= */
export const registerWithVerification = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, email, password } = req.body; // Add password
    const photo = req.file;

    // Basic validation
    if (!name || !name.trim()) {
      throw new ApiError("Name is required", 400);
    }

    if (!email || !email.trim()) {
      throw new ApiError("Email is required", 400);
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ApiError("Please provide a valid email address", 400);
    }

    // Password validation (optional but if provided, validate)
    if (password && password.length < 6) {
      throw new ApiError("Password must be at least 6 characters", 400);
    }

    // Register user with email verification
    const result = await registerWithEmailVerification(
      name,
      email,
      password,
      photo,
    );

    ApiResponse(
      res,
      201,
      "Registration successful! Check your email for verification link.",
      {
        user: sanitizeUser(result.user),
        message:
          "Verification email sent. Please check your inbox (and spam folder).",
        hasTemporaryPassword: !!result.temporaryPassword,
        expiresIn: "24 hours",
      },
    );
  },
);

/* =========================
   VERIFY EMAIL TOKEN
========================= */
/* =========================
   VERIFY EMAIL TOKEN
========================= */
export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.params;

  if (!token) {
    // Return HTML error page
    res.setHeader("Content-Type", "text/html");
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Error - YMA Bouncy Castle</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .error { 
            background: white; 
            padding: 40px; 
            border-radius: 10px; 
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            margin: 0 auto;
            color: #333;
          }
          h1 { color: #e74c3c; }
          .btn { 
            background: #4299e1; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 5px; 
            display: inline-block;
            margin: 20px 0;
          }
          .logo {
            max-width: 150px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="error">
          <img src="https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png" alt="YMA Bouncy Castle" class="logo">
          <h1>❌ Verification Token Missing</h1>
          <p>Please use the complete verification link from your email.</p>
        </div>
      </body>
      </html>
    `);
  }

  try {
    // Verify token and update user
    const user = await verifyEmailToken(token);

    // ALWAYS return HTML (since this is called from email link click)
    res.setHeader("Content-Type", "text/html");
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verified - YMA Bouncy Castle</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          
          body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          
          .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            max-width: 500px;
            width: 100%;
            text-align: center;
          }
          
          .header {
            background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
            padding: 40px 30px;
            color: white;
          }
          
          .logo {
            max-width: 150px;
            margin-bottom: 20px;
          }
          
          .success-icon {
            font-size: 80px;
            margin-bottom: 20px;
            animation: bounce 1s ease infinite;
          }
          
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
          }
          
          .header p {
            opacity: 0.9;
            font-size: 16px;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .content h2 {
            color: #2d3748;
            margin-bottom: 20px;
            font-size: 24px;
          }
          
          .content p {
            color: #4a5568;
            margin-bottom: 15px;
            line-height: 1.6;
          }
          
          .user-info {
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
            text-align: left;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .info-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }
          
          .info-label {
            color: #718096;
            font-weight: 500;
          }
          
          .info-value {
            color: #2d3748;
            font-weight: 600;
          }
          
          .actions {
            margin: 30px 0;
          }
          
          .btn {
            display: inline-block;
            padding: 16px 32px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            margin: 10px;
            transition: all 0.3s ease;
            min-width: 180px;
          }
          
          .btn-primary {
            background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(66, 153, 225, 0.3);
          }
          
          .btn-primary:hover {
            background: linear-gradient(135deg, #3182ce 0%, #2c5282 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(66, 153, 225, 0.4);
          }
          
          .btn-secondary {
            background: #e2e8f0;
            color: #4a5568;
          }
          
          .btn-secondary:hover {
            background: #cbd5e0;
            transform: translateY(-2px);
          }
          
          .footer {
            background: #2d3748;
            color: #cbd5e0;
            padding: 25px;
            font-size: 14px;
          }
          
          .auto-redirect {
            background: #fffaf0;
            border-radius: 10px;
            padding: 15px;
            margin: 20px 0;
            border: 1px solid #fbd38d;
            color: #975a16;
          }
          
          .countdown {
            font-weight: 700;
            font-size: 18px;
            color: #4299e1;
          }
          
          @media (max-width: 480px) {
            .header {
              padding: 30px 20px;
            }
            
            .content {
              padding: 30px 20px;
            }
            
            .btn {
              display: block;
              width: 100%;
              margin: 10px 0;
            }
          }
        </style>
        <script>
          let countdown = 10;
          const countdownElement = document.getElementById('countdown');
          const countdownInterval = setInterval(() => {
            countdown--;
            countdownElement.textContent = countdown;
            
            if (countdown <= 0) {
              clearInterval(countdownInterval);
              window.location.href = '${
                process.env.FRONTEND_URL || "http://localhost:3000"
              }/login?verified=true';
            }
          }, 1000);
        </script>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">✅</div>
            <h1>Email Verified Successfully!</h1>
            <p>Your YMA Bouncy Castle account is now active</p>
          </div>
          
          <div class="content">
            <h2>Welcome aboard, ${user.name}!</h2>
            <p>Your email address <strong>${
              user.email
            }</strong> has been successfully verified.</p>
            
            <div class="user-info">
              <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${user.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value">${user.email}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Verified:</span>
                <span class="info-value" style="color: #38a169;">✅ Yes</span>
              </div>
              <div class="info-row">
                <span class="info-label">Account Created:</span>
                <span class="info-value">${new Date().toLocaleDateString()}</span>
              </div>
            </div>
            
            <div class="auto-redirect">
              <p>You will be automatically redirected to login in <span id="countdown" class="countdown">10</span> seconds...</p>
            </div>
            
            <div class="actions">
              <a href="${
                process.env.FRONTEND_URL || "http://localhost:3000"
              }/login?verified=true" class="btn btn-primary">
                Go to Login
              </a>
              <a href="${
                process.env.FRONTEND_URL || "http://localhost:3000"
              }" class="btn btn-secondary">
                Visit Homepage
              </a>
            </div>
            
            <p style="color: #718096; font-size: 14px; margin-top: 30px;">
              Check your email for login instructions and temporary password.
            </p>
          </div>
          
          <div class="footer">
            <p>YMA Bouncy Castle &copy; ${new Date().getFullYear()}</p>
            <p style="opacity: 0.6; margin-top: 10px; font-size: 12px;">
              Premium Party Equipment Rental Services
            </p>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error: any) {
    // Handle error with HTML page
    res.setHeader("Content-Type", "text/html");
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Error - YMA Bouncy Castle</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .error { 
            background: white; 
            padding: 40px; 
            border-radius: 10px; 
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            margin: 0 auto;
            color: #333;
          }
          h1 { color: #e74c3c; }
          .btn { 
            background: #4299e1; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 5px; 
            display: inline-block;
            margin: 20px 0;
          }
          .logo {
            max-width: 150px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="error">
          <img src="https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png" alt="YMA Bouncy Castle" class="logo">
          <h1>❌ ${error.message || "Verification Failed"}</h1>
          <p>The verification link is invalid or has expired.</p>
          <a href="${
            process.env.FRONTEND_URL || "http://localhost:3000"
          }/resend-verification" class="btn">
            Request New Verification Link
          </a>
        </div>
      </body>
      </html>
    `);
  }
};

/* =========================
   RESEND VERIFICATION EMAIL
========================= */
export const resendVerification = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      throw new ApiError("Email is required", 400);
    }

    // Resend verification email
    await resendVerificationEmail(email);

    ApiResponse(res, 200, "Verification email resent successfully", {
      message:
        "If your email exists and is not verified, a new verification link has been sent.",
      note: "Check your inbox and spam folder.",
      expiresIn: "24 hours",
      rateLimit: "Maximum 3 requests per hour",
    });
  },
);

/* =========================
   CHECK VERIFICATION STATUS
========================= */
export const checkVerificationStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      throw new ApiError("Email is required", 400);
    }

    const user = await User.findOne({ email }).select(
      "email name isEmailVerified verificationAttempts createdAt",
    );

    if (!user) {
      // Security: Don't reveal if user exists
      return ApiResponse(
        res,
        200,
        "If your email exists, you will receive verification instructions",
        {
          exists: false, // For internal use only
          message:
            "If your email exists and is not verified, you can request a new verification link.",
        },
      );
    }

    ApiResponse(res, 200, "Verification status retrieved", {
      email: user.email,
      name: user.name,
      isEmailVerified: user.isEmailVerified,
      canResend: !user.isEmailVerified,
      attempts: user.verificationAttempts,
      createdAt: user.createdAt,
      message: user.isEmailVerified
        ? "Email is already verified. You can login normally."
        : "Email is not verified. Please check your inbox for verification link.",
    });
  },
);
// ---------------- public: logout ----------------
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const aReq = req as AuthenticatedRequest;

  // Clear refresh token from database if user is authenticated
  if (aReq.user?.id) {
    await User.findByIdAndUpdate(aReq.user.id, {
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      lastLogoutAt: new Date(),
    });
  }

  // Clear cookies
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });

  // Also clear any other auth cookies you might have
  res.clearCookie("userId");
  res.clearCookie("userSession");

  // Check if request wants HTML or JSON
  const acceptsHtml = req.accepts("html");
  const isJson = req.accepts("json");

  if (acceptsHtml && !isJson) {
    // Return HTML logout success page
    res.setHeader("Content-Type", "text/html");
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Logged Out - YMA Bouncy Castle</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          
          body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          
          .logout-container {
            background: white;
            border-radius: 20px;
            padding: 50px 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.5s ease-out;
          }
          
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .logo {
            max-width: 120px;
            height: auto;
            margin-bottom: 20px;
          }
          
          .logout-icon {
            width: 80px;
            height: 80px;
            background: #4299e1;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 25px;
          }
          
          .logout-icon i {
            font-size: 40px;
            color: white;
          }
          
          h1 {
            color: #2d3748;
            margin-bottom: 15px;
            font-size: 28px;
          }
          
          p {
            color: #4a5568;
            margin-bottom: 25px;
            font-size: 16px;
            line-height: 1.6;
          }
          
          .security-info {
            background: #f7fafc;
            border-radius: 10px;
            padding: 20px;
            margin: 25px 0;
            text-align: left;
            border-left: 4px solid #48bb78;
          }
          
          .security-info h3 {
            color: #2b6cb0;
            margin-bottom: 15px;
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .security-list {
            list-style: none;
          }
          
          .security-list li {
            margin-bottom: 10px;
            padding-left: 25px;
            position: relative;
            color: #4a5568;
            font-size: 14px;
          }
          
          .security-list li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #48bb78;
            font-weight: bold;
          }
          
          .button-group {
            display: flex;
            gap: 15px;
            margin-top: 30px;
          }
          
          .btn {
            flex: 1;
            padding: 14px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            text-align: center;
            transition: all 0.3s ease;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          
          .btn-primary {
            background: #4299e1;
            color: white;
          }
          
          .btn-primary:hover {
            background: #3182ce;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(66, 153, 225, 0.4);
          }
          
          .btn-secondary {
            background: #e2e8f0;
            color: #4a5568;
          }
          
          .btn-secondary:hover {
            background: #cbd5e0;
            transform: translateY(-2px);
          }
          
          .auto-redirect {
            margin-top: 20px;
            color: #718096;
            font-size: 14px;
            padding: 10px;
            background: #f7fafc;
            border-radius: 8px;
          }
          
          .countdown {
            font-weight: bold;
            color: #4299e1;
          }
          
          @media (max-width: 600px) {
            .logout-container {
              padding: 30px 20px;
            }
            
            .button-group {
              flex-direction: column;
            }
            
            h1 {
              font-size: 24px;
            }
          }
        </style>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      </head>
      <body>
        <div class="logout-container">
          <img src="https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png" alt="YMA Bouncy Castle" class="logo">
          
          <div class="logout-icon">
            <i class="fas fa-sign-out-alt"></i>
          </div>
          
          <h1>Successfully Logged Out</h1>
          
          <p>You have been securely logged out of your YMA Bouncy Castle account.</p>
          
          <div class="security-info">
            <h3><i class="fas fa-shield-alt"></i> Security Confirmed</h3>
            <ul class="security-list">
              <li>All active sessions have been terminated</li>
              <li>Authentication tokens have been invalidated</li>
              <li>Your account is now secure</li>
              <li>Browser cookies have been cleared</li>
            </ul>
          </div>
          
          <div class="button-group">
            <a href="${
              process.env.FRONTEND_URL || "http://localhost:3000"
            }/login" class="btn btn-primary">
              <i class="fas fa-sign-in-alt"></i> Login Again
            </a>
            <a href="${
              process.env.FRONTEND_URL || "http://localhost:3000"
            }" class="btn btn-secondary">
              <i class="fas fa-home"></i> Go to Homepage
            </a>
          </div>
          
          <div class="auto-redirect">
            <p>You will be redirected to the homepage in <span class="countdown" id="countdown">10</span> seconds</p>
          </div>
          
          <script>
            // Auto-redirect countdown
            let countdown = 10;
            const countdownElement = document.getElementById('countdown');
            
            const countdownInterval = setInterval(() => {
              countdown--;
              countdownElement.textContent = countdown;
              
              if (countdown <= 0) {
                clearInterval(countdownInterval);
                window.location.href = '${
                  process.env.FRONTEND_URL || "http://localhost:3000"
                }';
              }
            }, 1000);
          </script>
        </div>
      </body>
      </html>
    `);
  }

  // For API requests, return JSON
  ApiResponse(res, 200, "Logged out successfully", {
    success: true,
    message: "You have been logged out successfully",
    timestamp: new Date().toISOString(),
    redirectTo: `${process.env.FRONTEND_URL || "http://localhost:3000"}/login`,
  });
});
