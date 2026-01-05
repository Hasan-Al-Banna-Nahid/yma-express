import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/apiError";
import { IUser } from "../modules/Auth/user.interface";
import mongoose from "mongoose";

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
