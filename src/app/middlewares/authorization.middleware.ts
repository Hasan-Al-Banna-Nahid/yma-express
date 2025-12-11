import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import ApiError from "../utils/apiError";
import User from "../modules/Auth/user.model";
import { IUser } from "../modules/Auth/user.interface";
import mongoose from "mongoose";

type AuthenticatedRequest = Request & { user?: IUser };

// ---------------------------------------------
// PROTECT → Requires Bearer Token
// ---------------------------------------------
export const protect = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    let token;

    // 1. Get bearer token
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new ApiError("You are not logged in", 401));
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
    };

    // 3. Check user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new ApiError("User no longer exists", 401));
    }

    // 4. Attach user to req
    (req as AuthenticatedRequest).user = user;

    next();
  } catch (err) {
    next(new ApiError("Invalid or expired token", 401));
  }
};

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
