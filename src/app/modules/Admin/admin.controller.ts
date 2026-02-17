import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import asyncHandler from "../../utils/asyncHandler";
import ApiError from "../../utils/apiError";
import { ApiResponse } from "../../utils/apiResponse";
import User from "../Auth/user.model";
import { uploadToCloudinary } from "../../utils/cloudinary.util";
import Order from "../Order/order.model"; // Import your Order model
import fs from "fs";
import path from "path";

type AuthenticatedRequest = Request & { user: any };

// ==================== ADMIN USER MANAGEMENT ====================
// ==================== ORDER STATISTICS ====================

// Assuming you have cloudinary setup

// Define the update fields interface
interface IUpdateAdminSettings {
  name?: string;
  email?: string;
  photo?: string;
}

export const updateAdminSettings = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // Get user ID from authenticated request
    const userId = (req as any).user._id;

    // Find the user
    const user = await User.findById(userId);

    if (!user) {
      return next(new ApiError("User not found", 404));
    }

    // Extract allowed fields from request body
    const { firstName, lastName, name, email } = req.body;

    // Prepare update data
    const updateData: IUpdateAdminSettings = {};

    // Handle name update
    // Option 1: If using separate first/last name
    if (firstName || lastName) {
      updateData.name = `${firstName || ""} ${lastName || ""}`.trim();
    }
    // Option 2: If using single name field directly
    else if (name && name !== user.name) {
      updateData.name = name.trim();
    }

    // Handle email update with validation
    if (email && email !== user.email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(new ApiError("Please provide a valid email address", 400));
      }

      // Check if email already exists for another user
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId },
      });

      if (existingUser) {
        return next(new ApiError("Email already in use", 400));
      }

      updateData.email = email.toLowerCase();
      // Optional: Mark email as unverified when changed
      // updateData.isEmailVerified = false;
    }

    // Handle photo upload from multer files
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      try {
        const file = req.files[0] as Express.Multer.File;

        // Validate file type
        const allowedMimeTypes = [
          "image/jpeg",
          "image/png",
          "image/jpg",
          "image/gif",
          "image/webp",
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return next(new ApiError("Only image files are allowed!", 400));
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          return next(new ApiError("File size must be less than 10MB", 400));
        }

        // Upload to Cloudinary using your uploadToCloudinary function
        // Since you're using multer-storage-cloudinary, the file is already uploaded
        // and the URL is stored in file.path

        if (file.path && typeof file.path === "string") {
          updateData.photo = file.path; // Cloudinary URL is already in file.path
        } else {
          // Fallback: If file.path doesn't exist, upload using buffer
          const uploadResult = await uploadToCloudinary(
            file.buffer,
            "admin-profiles",
          );
          updateData.photo = uploadResult;
        }
      } catch (error: any) {
        console.error("Error uploading photo:", error);
        return next(
          new ApiError(`Failed to upload profile photo: ${error.message}`, 500),
        );
      }
    }
    // Alternative: Handle photo as base64 string from request body
    else if (req.body.photo && req.body.photo.startsWith("data:image/")) {
      try {
        const uploadResult = await uploadToCloudinary(
          req.body.photo,
          "admin-profiles",
        );
        updateData.photo = uploadResult;
      } catch (error: any) {
        return next(
          new ApiError(`Failed to upload photo: ${error.message}`, 500),
        );
      }
    }

    // If no data to update
    if (Object.keys(updateData).length === 0) {
      return next(new ApiError("No fields to update", 400));
    }

    // Update the user (only allowed fields)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData }, // Only update specified fields
      {
        new: true,
        runValidators: true,
        context: "query", // This helps with validation
      },
    ).select(
      "-password -refreshTokenHash -passwordResetToken -emailVerificationToken",
    );

    if (!updatedUser) {
      return next(new ApiError("Failed to update user settings", 500));
    }

    // Send response
    ApiResponse(res, 200, "Admin settings updated successfully", {
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        photo: updatedUser.photo,
        role: updatedUser.role,
        isEmailVerified: updatedUser.isEmailVerified,
        active: updatedUser.active,
      },
    });
  },
);
export const getOrderStatistics = asyncHandler(
  async (req: Request, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Execute all queries in parallel
    const [
      totalPendingOrders,
      todayRevenueResult,
      totalDeliveriesResult,
      highestDemandProducts,
    ] = await Promise.all([
      // 1. Total pending orders
      Order.countDocuments({
        status: { $in: ["pending", "processing", "confirmed"] },
      }),

      // 2. Revenue generated today
      Order.aggregate([
        {
          $match: {
            status: "delivered",
            updatedAt: { $gte: today, $lt: tomorrow },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            totalOrders: { $sum: 1 },
          },
        },
      ]),

      // 3. Total deliveries (completed orders)
      Order.countDocuments({ status: "delivered" }),

      // 4. Highest demand products (top 5)
      Order.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            productName: { $first: "$items.name" },
            totalQuantity: { $sum: "$items.quantity" },
            totalOrders: { $sum: 1 },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Process results
    const todayRevenue = todayRevenueResult[0] || {
      totalRevenue: 0,
      totalOrders: 0,
    };
    const totalDeliveries = totalDeliveriesResult || 0;

    ApiResponse(res, 200, "Order statistics retrieved", {
      statistics: {
        totalPendingOrders,
        todayRevenue: {
          amount: todayRevenue.totalRevenue,
          currency: "POUNDS",
          orders: todayRevenue.totalOrders,
        },
        totalDeliveries,
        highestDemandProducts: highestDemandProducts.map((product) => ({
          productId: product._id,
          productName: product.productName,
          totalQuantity: product.totalQuantity,
          totalOrders: product.totalOrders,
        })),
      },
      timestamp: new Date(),
    });
  },
);

// ==================== DASHBOARD SUMMARY ====================
export const getDashboardSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [todayStats, yesterdayStats, pendingOrders, recentOrders] =
      await Promise.all([
        // Today's revenue and orders
        Order.aggregate([
          {
            $match: {
              status: "delivered",
              updatedAt: { $gte: today },
            },
          },
          {
            $group: {
              _id: null,
              revenue: { $sum: "$totalAmount" },
              orders: { $sum: 1 },
            },
          },
        ]),

        // Yesterday's revenue and orders (for comparison)
        Order.aggregate([
          {
            $match: {
              status: "delivered",
              updatedAt: { $gte: yesterday, $lt: today },
            },
          },
          {
            $group: {
              _id: null,
              revenue: { $sum: "$totalAmount" },
              orders: { $sum: 1 },
            },
          },
        ]),

        // Pending orders with count
        Order.countDocuments({
          status: { $in: ["pending", "processing"] },
        }),

        // Recent orders (last 5)
        Order.find()
          .select("orderNumber status totalAmount createdAt")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

    const todayData = todayStats[0] || { revenue: 0, orders: 0 };
    const yesterdayData = yesterdayStats[0] || { revenue: 0, orders: 0 };

    // Calculate percentage change
    const revenueChange =
      yesterdayData.revenue === 0
        ? 100
        : ((todayData.revenue - yesterdayData.revenue) /
            yesterdayData.revenue) *
          100;

    const ordersChange =
      yesterdayData.orders === 0
        ? 100
        : ((todayData.orders - yesterdayData.orders) / yesterdayData.orders) *
          100;

    ApiResponse(res, 200, "Dashboard summary retrieved", {
      summary: {
        revenue: {
          today: todayData.revenue,
          yesterday: yesterdayData.revenue,
          change: parseFloat(revenueChange.toFixed(2)),
        },
        orders: {
          today: todayData.orders,
          yesterday: yesterdayData.orders,
          change: parseFloat(ordersChange.toFixed(2)),
        },
        pendingOrders,
        recentOrders: recentOrders.map((order) => ({
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
        })),
      },
    });
  },
);
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
    photoUrl = await uploadToCloudinary(photo.buffer);
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
    const photoUrl = await uploadToCloudinary(photo.buffer);
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
  },
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
  },
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
  },
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
  },
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
  },
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
      (id: string) => !mongoose.Types.ObjectId.isValid(id),
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
  },
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
  },
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
  },
);
