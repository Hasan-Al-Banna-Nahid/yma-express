import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import User from "../models/user.model";
import ApiError from "../utils/apiError";

// GET /admin/users?search=&page=1&limit=20&sort=-createdAt
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;
  const sort = String(req.query.sort || "-createdAt");

  const search = String(req.query.search || "").trim();
  const filter: any = search ? { $text: { $search: search } } : {};

  const [items, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  ApiResponse(res, 200, "Users fetched", {
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

// GET /admin/users/:id
export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) throw new ApiError("User not found", 404);
  ApiResponse(res, 200, "User fetched", { user });
});

// PATCH /admin/users/:id/role
export const updateUserRole = asyncHandler(
  async (req: Request, res: Response) => {
    const { role } = req.body;
    if (!["user", "admin"].includes(role))
      throw new ApiError("Invalid role", 400);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).lean();
    if (!user) throw new ApiError("User not found", 404);
    ApiResponse(res, 200, "Role updated", { user });
  }
);

// PATCH /admin/users/:id
export const adminUpdateUser = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, email, photo, active } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, photo, active },
      { new: true, runValidators: true }
    ).lean();
    if (!user) throw new ApiError("User not found", 404);
    ApiResponse(res, 200, "User updated", { user });
  }
);

// DELETE /admin/users/:id (soft)
export const softDeleteUser = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    ).lean();
    if (!user) throw new ApiError("User not found", 404);
    ApiResponse(res, 200, "User soft-deleted", { user });
  }
);

// DELETE /admin/users/:id/hard
export const hardDeleteUser = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await User.findByIdAndDelete(req.params.id).lean();
    if (!user) throw new ApiError("User not found", 404);
    ApiResponse(res, 200, "User hard-deleted");
  }
);
