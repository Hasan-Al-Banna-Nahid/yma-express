// middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import { IUser } from "../interfaces/user.interface";
import { protect as verifyAccessToken } from "../services/auth.service";
import jwt from "jsonwebtoken";

export type AuthenticatedRequest = Request & { user: IUser };

export const protectRoute = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const cookieToken = (req as any).cookies?.accessToken as string | undefined;
    const headerToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : undefined;

    let tokenToUse: string | undefined = cookieToken || headerToken;

    // Debug logging
    console.log("🔐 Auth Debug:", {
      hasCookieToken: !!cookieToken,
      hasHeaderToken: !!headerToken,
      tokenToUse: tokenToUse ? "Present" : "Missing",
    });

    if (!tokenToUse) throw new ApiError("No token provided", 401);

    const currentUser = await verifyAccessToken(tokenToUse);

    // Debug user info - check if role is present
    console.log("👤 User Debug:", {
      userId: currentUser._id,
      email: currentUser.email,
      role: currentUser.role,
      hasRole: !!currentUser.role,
      isActive: currentUser.active,
    });

    // Ensure role exists
    if (!currentUser.role) {
      console.error("❌ User role is missing!");
      throw new ApiError("User role not found", 401);
    }

    (req as AuthenticatedRequest).user = currentUser;
    next();
  }
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
        403
      );
    }
    next();
  };
}
