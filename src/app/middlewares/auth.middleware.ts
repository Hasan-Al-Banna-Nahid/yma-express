// src/app/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import { IUser } from "../modules/Auth/user.interface";
import jwt from "jsonwebtoken";
import User from "../modules/Auth/user.model";

export type AuthenticatedRequest = Request & { user: IUser };

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const protectRoute = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    let token: string | undefined;

    /* -------------------- 1. Bearer token -------------------- */
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      // Added .trim() to ensure no hidden spaces cause "malformed" errors
      token = req.headers.authorization.split(" ")[1]?.trim();
    }

    /* -------------------- 2. Cookie token -------------------- */
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token || token === "undefined" || token === "null") {
      throw new ApiError(
        "Authentication failed. Please login to get access.",
        401,
      );
    }

    /* -------------------- 3. Verify token -------------------- */
    let decoded: any;
    try {
      // We wrap this in a try-catch to handle "jwt malformed" or "jwt expired" errors gracefully
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
        iat: number;
      };
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw new ApiError("Your token has expired. Please login again.", 401);
      }
      // This catches "jwt malformed", "invalid signature", etc.
      throw new ApiError("Invalid token. Please login again.", 401);
    }

    /* -------------------- 4. Get user -------------------- */
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new ApiError(
        "The user belonging to this token no longer exists.",
        401,
      );
    }

    /* -------------------- 5. Password changed check -------------------- */
    // Ensure the method exists on your user model
    if (typeof user.changedPasswordAfter === "function") {
      if (user.changedPasswordAfter(decoded.iat)) {
        throw new ApiError(
          "User recently changed password! Please login again.",
          401,
        );
      }
    }

    /* -------------------- 6. Attach user -------------------- */
    (req as AuthenticatedRequest).user = user;

    next();
  },
);

export function restrictTo(...roles: Array<IUser["role"]>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const aReq = req as AuthenticatedRequest;

    // Debug role check
    console.log("🔒 Role Check Debug:", {
      userRole: aReq.user?.role,
      requiredRoles: roles,
      hasUser: !!aReq.user,
    });

    if (!aReq.user) {
      throw new ApiError("Authentication required for this action", 401);
    }

    if (!roles.includes(aReq.user.role)) {
      throw new ApiError(
        `Permission denied. Required roles: ${roles.join(", ")}`,
        403,
      );
    }
    next();
  };
}
