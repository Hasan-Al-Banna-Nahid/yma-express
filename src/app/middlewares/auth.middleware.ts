// middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import { IUser } from "../modules/Auth/user.interface";
import { protect as verifyAccessToken } from "../modules/Auth/auth.service";
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

export const protectRoute = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token;

    // 1️⃣ Bearer token (Postman / mobile / API)
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2️⃣ Cookie token (Browser)
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(
        new ApiError(
          "You are not logged in. Please log in to get access.",
          401,
        ),
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      iat: number;
      exp: number;
    };

    const user = await User.findById(decoded.id).select("+active");

    if (!user) {
      return next(
        new ApiError("The user belonging to this token no longer exists.", 401),
      );
    }

    if (user.changedPasswordAfter(decoded.iat)) {
      return next(
        new ApiError(
          "User recently changed password. Please log in again.",
          401,
        ),
      );
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      return next(new ApiError("Invalid token. Please log in again!", 401));
    }
    if (error.name === "TokenExpiredError") {
      return next(
        new ApiError("Your token has expired. Please log in again!", 401),
      );
    }
    next(error);
  }
};

export function restrictTo(...roles: Array<IUser["role"]>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const aReq = req as AuthenticatedRequest;

    // Debug role check
    console.log("🔒 Role Check Debug:", {
      userRole: aReq.user?.role,
      requiredRoles: roles,
      hasUser: !!aReq.user,
      userAuthorized: aReq.user && roles.includes(aReq.user.role),
    });

    if (!aReq.user) {
      throw new ApiError("Authentication required", 401);
    }

    if (!roles.includes(aReq.user.role)) {
      throw new ApiError(
        `Unauthorized - Required roles: ${roles.join(", ")}, Your role: ${
          aReq.user.role
        }`,
        403,
      );
    }
    next();
  };
}
