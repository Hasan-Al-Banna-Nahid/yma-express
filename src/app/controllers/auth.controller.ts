import dotenv from "dotenv";
dotenv.config();

import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { IUser } from "../interfaces/user.interface";
import User from "../models/user.model";

import {
  forgotPassword,
  login,
  resetPassword,
  signup,
  updatePassword,
  protect as verifyAccessTokenService,
} from "../services/auth.service";

import ApiError from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import asyncHandler from "../utils/asyncHandler";
import { hashToken, issueTokens, sanitizeUser } from "../utils/auth.util";
import { uploadToCloudinary } from "../utils/cloudinary.util";

type AuthenticatedRequest = Request & { user: IUser };

// ---------------- cookies helpers ----------------
export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 1000, // 1h
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
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const token =
      ((req as any).cookies?.refreshToken as string | undefined) ||
      req.body?.refreshToken;
    if (!token) throw new ApiError("Refresh token required", 401);

    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as any;
    const user = await User.findById(payload.id).select(
      "+refreshTokenHash +refreshTokenExpiresAt"
    );
    if (!user) throw new ApiError("Invalid refresh token", 401);

    const matches = user.refreshTokenHash === hashToken(token);
    const notExpired =
      !user.refreshTokenExpiresAt || user.refreshTokenExpiresAt > new Date();
    if (!matches || !notExpired)
      throw new ApiError("Invalid/expired refresh token", 401);

    const rotated = await issueTokens(user);
    setAuthCookies(res, rotated.accessToken, rotated.refreshToken);
    ApiResponse(res, 200, "Token refreshed", {
      user: sanitizeUser(user),
      tokens: rotated,
    });
  }
);

// ---------------- public: logout ----------------
export const logout = asyncHandler(async (_req: Request, res: Response) => {
  const aReq = _req as AuthenticatedRequest;
  if (aReq.user?.id) {
    // Update lastLogoutAt to invalidate existing tokens
    await User.findByIdAndUpdate(aReq.user.id, {
      lastLogoutAt: new Date(),
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    });
  }
  clearAuthCookies(res);
  ApiResponse(res, 200, "Logged out", {});
});

// ---------------- public: forgot password ----------------
export const forgotPasswordHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;
    await forgotPassword(email);
    ApiResponse(res, 200, "Token sent to email!");
  }
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
export const resetPasswordHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const token = (req.body?.token || req.params?.token) as string | undefined;
    const { password, passwordConfirm } = req.body;
    if (!token) throw new ApiError("Missing token", 400);

    const user = await resetPassword(token, password, passwordConfirm);

    // Logout this browser after reset: clear cookies (no auto-login)
    clearAuthCookies(res);

    const isFormPost =
      req.is("application/x-www-form-urlencoded") ||
      req.headers.accept?.includes("text/html");

    if (isFormPost) {
      return res.status(200).render("auth/resetSuccess", {
        title: "Password updated",
        email: (user as any).email,
        preheader: "Your password has been changed successfully.",
      });
    }

    return ApiResponse(
      res,
      200,
      "Password reset successfully — please log in again",
      { user: sanitizeUser(user), requireLogin: true }
    );
  }
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
      newPasswordConfirm
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
  }
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
    "+password +refreshTokenHash +refreshTokenExpiresAt"
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
        400
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
  }
);
