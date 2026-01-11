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
  next: NextFunction
) => {
  try {
    // 1. Get token from header
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // Check if token exists
    if (!token) {
      return next(
        new ApiError("You are not logged in. Please log in to get access.", 401)
      );
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      iat: number;
      exp: number;
    };

    // 3. Check if user still exists
    const user = await User.findById(decoded.id).select("+active");

    if (!user) {
      return next(
        new ApiError("The user belonging to this token no longer exists.", 401)
      );
    }

    // 4. Check if user changed password after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return next(
        new ApiError(
          "User recently changed password. Please log in again.",
          401
        )
      );
    }

    // 5. Grant access to protected route
    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      return next(new ApiError("Invalid token. Please log in again!", 401));
    }
    if (error.name === "TokenExpiredError") {
      return next(
        new ApiError("Your token has expired. Please log in again!", 401)
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
        403
      );
    }
    next();
  };
}
