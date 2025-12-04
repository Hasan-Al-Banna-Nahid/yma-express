import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/apiError";
import { IUser } from "../interfaces/user.interface";
import mongoose from "mongoose";

type AuthenticatedRequest = Request & { user: IUser };

// Restrict access to specific roles
export const restrictTo = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const aReq = req as AuthenticatedRequest;

    if (!aReq.user) {
      return next(new ApiError("You are not logged in", 401));
    }

    if (!allowedRoles.includes(aReq.user.role)) {
      return next(
        new ApiError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};

// Check if user can manage another user
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

  // Skip if this is not a user ID route (like /change-role)
  if (!targetUserId || targetUserId === "change-role") {
    return next();
  }

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    return next(new ApiError("Invalid user ID", 400));
  }

  // Only superadmin can manage other admins/superadmins
  if (aReq.user.role !== "superadmin") {
    return next(new ApiError("Only superadmin can manage this user", 403));
  }

  next();
};
