import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/apiError";

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  if (!user) {
    return next(new ApiError("Not authenticated", 401));
  }

  if (user.role !== "admin") {
    return next(new ApiError("Access denied. Admin only.", 403));
  }

  next();
};
