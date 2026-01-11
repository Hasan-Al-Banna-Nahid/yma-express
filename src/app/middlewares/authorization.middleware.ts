import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/apiError";
import { IUser } from "../modules/Auth/user.interface";
import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler";
import { protect as verifyAccessToken } from "../modules/Auth/auth.service";

type AuthenticatedRequest = Request & { user?: IUser };

// ---------------------------------------------
// restrictTo → Only selected roles can access
// ---------------------------------------------
export const restrictTo = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const aReq = req as AuthenticatedRequest;

    if (!aReq.user) {
      return next(new ApiError("You are not logged in", 401));
    }

    if (!allowedRoles.includes(aReq.user.role)) {
      return next(new ApiError("You do not have permission", 403));
    }

    next();
  };
};

// ---------------------------------------------
// canManageUser → Ensure only superadmin manages
// ---------------------------------------------
export const canManageUser = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const aReq = req as AuthenticatedRequest;

  if (!aReq.user) {
    return next(new ApiError("You are not logged in", 401));
  }

  const targetUserId = req.params.id;

  // Not a user route (e.g., /change-role)
  if (!targetUserId || targetUserId === "change-role") {
    return next();
  }

  // Validate ObjectID
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    return next(new ApiError("Invalid user ID", 400));
  }

  // Only superadmin can manage admins/superadmins
  if (aReq.user.role !== "superadmin") {
    return next(new ApiError("Only superadmin can manage users", 403));
  }

  next();
};
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
