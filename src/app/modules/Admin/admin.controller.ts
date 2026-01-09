import { Request, Response } from "express";
import mongoose from "mongoose";
import asyncHandler from "../../utils/asyncHandler";
import ApiError from "../../utils/apiError";
import { ApiResponse } from "../../utils/apiResponse";
import User from "../Auth/user.model";
import { uploadToCloudinary } from "../../utils/cloudinary.util";

type AuthenticatedRequest = Request & { user: any };

// ==================== ADMIN USER MANAGEMENT ====================

// Get all users with pagination
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, role, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  // Build query
  const query: any = {};

  if (role && role !== "all") {
    query.role = role;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // Execute queries
  const [users, total] = await Promise.all([
    User.find(query)
      .select("-password")
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

// Get single user by ID
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Invalid user ID", 400);
  }

  const user = await User.findById(id).select("-password");

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  ApiResponse(res, 200, "User retrieved successfully", { user });
});

// Create new user
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  const photo = req.file;

  // Validate required fields
  if (!name || !email || !password || !role) {
    throw new ApiError("Name, email, password, and role are required", 400);
  }

  // Validate role
  const validRoles = ["admin", "editor", "delivery", "user"];
  if (!validRoles.includes(role)) {
    throw new ApiError(`Role must be one of: ${validRoles.join(", ")}`, 400);
  }

  // Check if email exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError("Email already in use", 400);
  }

  // Upload photo if exists
  let photoUrl = "";
  if (photo) {
    photoUrl = await uploadToCloudinary(photo);
  }

  // Create user
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role,
    photo: photoUrl || undefined,
    active: true,
  });

  // Prepare response
  const userResponse = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    photo: user.photo,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  ApiResponse(res, 201, "User created successfully", { user: userResponse });
});

// Update user
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;
  const photo = req.file;

  // Validate ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Invalid user ID", 400);
  }

  // Find user
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Upload new photo if provided
  if (photo) {
    const photoUrl = await uploadToCloudinary(photo);
    updateData.photo = photoUrl;
  }

  // Handle email change
  if (updateData.email && updateData.email !== user.email) {
    const existingUser = await User.findOne({
      email: updateData.email.toLowerCase(),
      _id: { $ne: id },
    });
    if (existingUser) {
      throw new ApiError("Email already in use", 400);
    }
    updateData.email = updateData.email.toLowerCase();
  }

  // Update user
  Object.assign(user, updateData);
  await user.save();

  // Prepare response
  const userResponse = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    photo: user.photo,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  ApiResponse(res, 200, "User updated successfully", { user: userResponse });
});

// Delete user (deactivate)
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const aReq = req as AuthenticatedRequest;

  // Validate ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Invalid user ID", 400);
  }

  // Cannot delete yourself
  if (aReq.user.id === id) {
    throw new ApiError("You cannot delete your own account", 400);
  }

  // Find and deactivate user
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError("User not found", 404);
  }

  user.active = false;
  await user.save();

  ApiResponse(res, 200, "User deactivated successfully");
});

// Activate user
export const activateUser = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError("Invalid user ID", 400);
    }

    // Find and activate user
    const user = await User.findById(id);
    if (!user) {
      throw new ApiError("User not found", 404);
    }

    user.active = true;
    await user.save();

    ApiResponse(res, 200, "User activated successfully");
  }
);

// Change user password (admin can reset password)
export const changeUserPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError("Invalid user ID", 400);
    }

    if (!newPassword || newPassword.length < 6) {
      throw new ApiError("Password must be at least 6 characters", 400);
    }

    // Find user and update password
    const user = await User.findById(id);
    if (!user) {
      throw new ApiError("User not found", 404);
    }

    user.password = newPassword;
    await user.save();

    ApiResponse(res, 200, "Password updated successfully");
  }
);

// ==================== ADMIN STATISTICS ====================

// Get system statistics
export const getSystemStats = asyncHandler(
  async (req: Request, res: Response) => {
    const [
      totalUsers,
      activeUsers,
      admins,
      editors,
      delivery,
      regularUsers,
      newUsersToday,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ active: true }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "editor" }),
      User.countDocuments({ role: "delivery" }),
      User.countDocuments({ role: "user" }),
      User.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
    ]);

    ApiResponse(res, 200, "System statistics retrieved", {
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          byRole: {
            admin: admins,
            editor: editors,
            delivery: delivery,
            user: regularUsers,
          },
          newToday: newUsersToday,
        },
      },
    });
  }
);

// Get user activity summary
export const getUserActivity = asyncHandler(
  async (req: Request, res: Response) => {
    const { days = 30 } = req.query;

    const date = new Date();
    date.setDate(date.getDate() - Number(days));

    // Get user registration by day
    const registrationsByDay = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: date },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get users by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get active vs inactive
    const activeStatus = await User.aggregate([
      {
        $group: {
          _id: "$active",
          count: { $sum: 1 },
        },
      },
    ]);

    ApiResponse(res, 200, "User activity retrieved", {
      registrationsByDay,
      usersByRole,
      activeStatus,
    });
  }
);
// ==================== ROLE MANAGEMENT ====================

// Change user role
export const changeUserRole = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;
    const aReq = req as AuthenticatedRequest;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError("Invalid user ID", 400);
    }

    // Validate role
    if (!role) {
      throw new ApiError("Role is required", 400);
    }

    const validRoles = ["admin", "editor", "delivery", "user"];
    if (!validRoles.includes(role)) {
      throw new ApiError(`Role must be one of: ${validRoles.join(", ")}`, 400);
    }

    // Cannot change your own role
    if (aReq.user.id === id) {
      throw new ApiError("You cannot change your own role", 400);
    }

    // Find user
    const user = await User.findById(id);
    if (!user) {
      throw new ApiError("User not found", 404);
    }

    // Update role
    user.role = role;
    await user.save();

    // Prepare response
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      photo: user.photo,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    ApiResponse(res, 200, "User role updated successfully", {
      user: userResponse,
    });
  }
);

// Bulk change roles
export const bulkChangeRoles = asyncHandler(
  async (req: Request, res: Response) => {
    const { userIds, role } = req.body;
    const aReq = req as AuthenticatedRequest;

    // Validate inputs
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new ApiError("User IDs array is required", 400);
    }

    if (!role) {
      throw new ApiError("Role is required", 400);
    }

    const validRoles = ["admin", "editor", "delivery", "user"];
    if (!validRoles.includes(role)) {
      throw new ApiError(`Role must be one of: ${validRoles.join(", ")}`, 400);
    }

    // Check if trying to change own role
    if (userIds.includes(aReq.user.id)) {
      throw new ApiError("You cannot change your own role", 400);
    }

    // Validate all IDs
    const invalidIds = userIds.filter(
      (id: string) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidIds.length > 0) {
      throw new ApiError(`Invalid user IDs: ${invalidIds.join(", ")}`, 400);
    }

    // Update roles
    const result = await User.updateMany({ _id: { $in: userIds } }, { role });

    // Get updated users
    const updatedUsers = await User.find({ _id: { $in: userIds } })
      .select("-password")
      .sort({ createdAt: -1 });

    ApiResponse(res, 200, "Roles updated successfully", {
      success: true,
      message: `${result.modifiedCount} users updated`,
      updatedCount: result.modifiedCount,
      users: updatedUsers.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      })),
    });
  }
);

// Get all users by specific role
export const getUsersByRole = asyncHandler(
  async (req: Request, res: Response) => {
    const { role } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Validate role
    const validRoles = ["admin", "editor", "delivery", "user"];
    if (!validRoles.includes(role)) {
      throw new ApiError(`Role must be one of: ${validRoles.join(", ")}`, 400);
    }

    // Build query
    const query = { role };

    // Execute queries
    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    ApiResponse(res, 200, `Users with role '${role}' retrieved`, {
      role,
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  }
);

// Get role statistics
export const getRoleStats = asyncHandler(
  async (req: Request, res: Response) => {
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ["$active", true] }, 1, 0] },
          },
          verified: {
            $sum: { $cond: [{ $eq: ["$isEmailVerified", true] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          role: "$_id",
          total: 1,
          active: 1,
          inactive: { $subtract: ["$total", "$active"] },
          verified: 1,
          unverified: { $subtract: ["$total", "$verified"] },
        },
      },
      { $sort: { role: 1 } },
    ]);

    ApiResponse(res, 200, "Role statistics retrieved", {
      stats: roleStats,
    });
  }
);
