// src/app/middlewares/auth.middleware.ts
import dotenv from "dotenv";
dotenv.config();
import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import jwt from "jsonwebtoken";
import User from "../modules/Auth/user.model";
import { IUser } from "../modules/Auth/user.interface";

export type AuthenticatedRequest = Request & { user: IUser };

export const protectRoute = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    let token: string | undefined;

    // 1. EXTRACT: Check Bearer Header
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    // 2. EXTRACT: Check Cookies
    else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    // 3. SANITIZE: Remove quotes or "undefined"/"null" strings often sent by frontends
    if (token) {
      token = token.replace(/['"]+/g, "").trim();
    }

    if (!token || token === "undefined" || token === "null") {
      throw new ApiError(
        "You are not logged in. Please login to get access.",
        401,
      );
    }

    // 4. VERIFY: Using a try-catch to pinpoint the exact failure
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error("JWT_SECRET is missing from environment variables");
      }

      const decoded = jwt.verify(token, secret) as { id: string; iat: number };

      const user = await User.findById(decoded.id);
      if (!user) {
        throw new ApiError(
          "The user belonging to this token no longer exists.",
          401,
        );
      }

      if (typeof user.changedPasswordAfter === "function") {
        if (user.changedPasswordAfter(decoded.iat)) {
          throw new ApiError(
            "Password recently changed! Please login again.",
            401,
          );
        }
      }

      (req as AuthenticatedRequest).user = user;
      next();
    } catch (error: any) {
      console.error("DEBUG - Token Verification Failed:", error.message);

      if (error.name === "TokenExpiredError") {
        throw new ApiError("Session expired. Please login again.", 401);
      }
      // If it reaches here, the token is structurally invalid or secret is wrong
      throw new ApiError(
        "Invalid token signature or format. Please login again.",
        401,
      );
    }
  },
);
