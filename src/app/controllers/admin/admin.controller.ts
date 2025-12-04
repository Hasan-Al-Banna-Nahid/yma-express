import mongoose from "mongoose";
import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import ApiError from "../../utils/apiError";
import { ApiResponse } from "../../utils/apiResponse";
import User from "../../models/user.model";
import { uploadToCloudinary } from "../../utils/cloudinary.util";
import { UserRole } from "../../interfaces/user.interface";

type AuthenticatedRequest = Request & { user: any };

// Get all users (admin only)
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, role, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const query: any = {};

  if (role) query.role = role;

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select("-password -refreshTokenHash -refreshTokenExpiresAt")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    User.countDocuments(query),
  ]);

  ApiResponse(res, 200, "Users retrieved successfully", {
    users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// Get user by ID
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError("Invalid user ID", 400);
  }

  const user = await User.findById(userId).select(
    "-password -refreshTokenHash -refreshTokenExpiresAt"
  );

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  ApiResponse(res, 200, "User retrieved successfully", { user });
});

// Create new user (admin/superadmin only)
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  const photo = req.file;
  const aReq = req as AuthenticatedRequest;

  // Validate required fields
  if (!name || !email || !password || !role) {
    throw new ApiError("Name, email, password, and role are required", 400);
  }

  // Validate role
  const allowedRoles: UserRole[] = ["admin", "editor", "delivery", "user"];

  // Only superadmin can create superadmin
  if (role === "superadmin" && aReq.user.role !== "superadmin") {
    throw new ApiError("Only superadmin can create superadmin users", 403);
  }

  // Check if current user can assign this role
  if (aReq.user.role === "admin" && role === "admin") {
    throw new ApiError("Admin cannot create other admin users", 403);
  }

  if (!allowedRoles.includes(role) && role !== "superadmin") {
    throw new ApiError("Invalid role specified", 400);
  }

  // Check if email exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError("Email already in use", 400);
  }

  let photoUrl;
  if (photo) {
    photoUrl = await uploadToCloudinary(photo);
  }

  // Create user
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role,
    photo: photoUrl,
    active: true,
  });

  // Remove sensitive fields
  const userResponse = user.toObject();
  delete (userResponse as any).password;
  delete (userResponse as any).refreshTokenHash;
  delete (userResponse as any).refreshTokenExpiresAt;

  ApiResponse(res, 201, "User created successfully", { user: userResponse });
});

// Update user
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id;
  const updateData = req.body;
  const photo = req.file;
  const aReq = req as AuthenticatedRequest;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError("Invalid user ID", 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Handle photo upload
  if (photo) {
    const photoUrl = await uploadToCloudinary(photo);
    updateData.photo = photoUrl;
  }

  // Handle email update
  if (updateData.email && updateData.email !== user.email) {
    const existingUser = await User.findOne({
      email: updateData.email.toLowerCase(),
      _id: { $ne: userId },
    });
    if (existingUser) {
      throw new ApiError("Email already in use", 400);
    }
    updateData.email = updateData.email.toLowerCase();
  }

  // Handle role update - only superadmin can change roles
  if (updateData.role && updateData.role !== user.role) {
    if (aReq.user.role !== "superadmin") {
      throw new ApiError("Only superadmin can change user roles", 403);
    }

    // Cannot change your own role
    if (aReq.user.id === userId) {
      throw new ApiError("You cannot change your own role", 400);
    }
  }

  // Update user
  Object.assign(user, updateData);
  await user.save({ validateModifiedOnly: true });

  // Remove sensitive fields
  const userResponse = user.toObject();
  delete (userResponse as any).password;
  delete (userResponse as any).refreshTokenHash;
  delete (userResponse as any).refreshTokenExpiresAt;

  ApiResponse(res, 200, "User updated successfully", { user: userResponse });
});

// Delete user (deactivate)
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id;
  const aReq = req as AuthenticatedRequest;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError("Invalid user ID", 400);
  }

  // Cannot delete yourself
  if (aReq.user.id === userId) {
    throw new ApiError("You cannot delete your own account", 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Check permission - only superadmin can delete admins
  if (user.role === "admin" && aReq.user.role !== "superadmin") {
    throw new ApiError("Only superadmin can delete admin users", 403);
  }

  // Deactivate user instead of deleting
  user.active = false;
  await user.save();

  ApiResponse(res, 200, "User deactivated successfully");
});

// Change user role (superadmin only)
export const changeUserRole = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, newRole } = req.body;
    console.log(req.body);
    const aReq = req as AuthenticatedRequest;

    // Validate required fields
    if (!userId || !newRole) {
      throw new ApiError("User ID and new role are required", 400);
    }

    // Only superadmin can change roles
    if (aReq.user.role !== "superadmin") {
      throw new ApiError("Only superadmin can change user roles", 403);
    }

    // Validate userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError("Invalid user ID", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError("User not found", 404);
    }

    // Cannot change your own role
    if (aReq.user.id === userId) {
      throw new ApiError("You cannot change your own role", 400);
    }

    // Validate new role
    const allowedRoles: UserRole[] = [
      "superadmin",
      "admin",
      "editor",
      "delivery",
      "user",
    ];
    if (!allowedRoles.includes(newRole)) {
      throw new ApiError("Invalid role specified", 400);
    }

    user.role = newRole;
    await user.save();

    const userResponse = user.toObject();
    delete (userResponse as any).password;
    delete (userResponse as any).refreshTokenHash;
    delete (userResponse as any).refreshTokenExpiresAt;

    ApiResponse(res, 200, "User role updated successfully", {
      user: userResponse,
    });
  }
);

// Get system statistics (admin/superadmin only)
export const getSystemStats = asyncHandler(
  async (req: Request, res: Response) => {
    const [
      totalUsers,
      activeUsers,
      superadmins,
      admins,
      editors,
      delivery,
      regularUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ active: true }),
      User.countDocuments({ role: "superadmin" }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "editor" }),
      User.countDocuments({ role: "delivery" }),
      User.countDocuments({ role: "user" }),
    ]);

    ApiResponse(res, 200, "System statistics retrieved", {
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          byRole: {
            superadmin: superadmins,
            admin: admins,
            editor: editors,
            delivery: delivery,
            user: regularUsers,
          },
        },
      },
    });
  }
);
