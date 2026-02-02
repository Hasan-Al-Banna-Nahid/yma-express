// middlewares/auth.middleware.ts
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
      token = req.headers.authorization.split(" ")[1];
    }

    /* -------------------- 2. Cookie token -------------------- */
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new ApiError("Unauthorized", 401);
    }

    /* -------------------- 3. Verify token -------------------- */
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      iat: number;
    };

    /* -------------------- 4. Get user -------------------- */
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new ApiError("User no longer exists", 401);
    }

    /* -------------------- 5. Password changed check -------------------- */
    if (user.changedPasswordAfter(decoded.iat)) {
      throw new ApiError("Password changed, please login again", 401);
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
