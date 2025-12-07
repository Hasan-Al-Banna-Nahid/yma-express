"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemStats = exports.changeUserRole = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const asyncHandler_1 = __importDefault(require("../../utils/asyncHandler"));
const apiError_1 = __importDefault(require("../../utils/apiError"));
const apiResponse_1 = require("../../utils/apiResponse");
const user_model_1 = __importDefault(require("../../models/user.model"));
const cloudinary_util_1 = require("../../utils/cloudinary.util");
// Get all users (admin only)
exports.getAllUsers = (0, asyncHandler_1.default)(async (req, res) => {
    const { page = 1, limit = 10, role, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query = {};
    if (role)
        query.role = role;
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }
    const [users, total] = await Promise.all([
        user_model_1.default.find(query)
            .select("-password -refreshTokenHash -refreshTokenExpiresAt")
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 }),
        user_model_1.default.countDocuments(query),
    ]);
    (0, apiResponse_1.ApiResponse)(res, 200, "Users retrieved successfully", {
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
exports.getUserById = (0, asyncHandler_1.default)(async (req, res) => {
    const userId = req.params.id;
    // Validate ObjectId
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        throw new apiError_1.default("Invalid user ID", 400);
    }
    const user = await user_model_1.default.findById(userId).select("-password -refreshTokenHash -refreshTokenExpiresAt");
    if (!user) {
        throw new apiError_1.default("User not found", 404);
    }
    (0, apiResponse_1.ApiResponse)(res, 200, "User retrieved successfully", { user });
});
// Create new user (admin/superadmin only)
exports.createUser = (0, asyncHandler_1.default)(async (req, res) => {
    const { name, email, password, role } = req.body;
    const photo = req.file;
    const aReq = req;
    // Validate required fields
    if (!name || !email || !password || !role) {
        throw new apiError_1.default("Name, email, password, and role are required", 400);
    }
    // Validate role
    const allowedRoles = ["admin", "editor", "delivery", "user"];
    // Only superadmin can create superadmin
    if (role === "superadmin" && aReq.user.role !== "superadmin") {
        throw new apiError_1.default("Only superadmin can create superadmin users", 403);
    }
    // Check if current user can assign this role
    if (aReq.user.role === "admin" && role === "admin") {
        throw new apiError_1.default("Admin cannot create other admin users", 403);
    }
    if (!allowedRoles.includes(role) && role !== "superadmin") {
        throw new apiError_1.default("Invalid role specified", 400);
    }
    // Check if email exists
    const existingUser = await user_model_1.default.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        throw new apiError_1.default("Email already in use", 400);
    }
    let photoUrl;
    if (photo) {
        photoUrl = await (0, cloudinary_util_1.uploadToCloudinary)(photo);
    }
    // Create user
    const user = await user_model_1.default.create({
        name,
        email: email.toLowerCase(),
        password,
        role,
        photo: photoUrl,
        active: true,
    });
    // Remove sensitive fields
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshTokenHash;
    delete userResponse.refreshTokenExpiresAt;
    (0, apiResponse_1.ApiResponse)(res, 201, "User created successfully", { user: userResponse });
});
// Update user
exports.updateUser = (0, asyncHandler_1.default)(async (req, res) => {
    const userId = req.params.id;
    const updateData = req.body;
    const photo = req.file;
    const aReq = req;
    // Validate ObjectId
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        throw new apiError_1.default("Invalid user ID", 400);
    }
    const user = await user_model_1.default.findById(userId);
    if (!user) {
        throw new apiError_1.default("User not found", 404);
    }
    // Handle photo upload
    if (photo) {
        const photoUrl = await (0, cloudinary_util_1.uploadToCloudinary)(photo);
        updateData.photo = photoUrl;
    }
    // Handle email update
    if (updateData.email && updateData.email !== user.email) {
        const existingUser = await user_model_1.default.findOne({
            email: updateData.email.toLowerCase(),
            _id: { $ne: userId },
        });
        if (existingUser) {
            throw new apiError_1.default("Email already in use", 400);
        }
        updateData.email = updateData.email.toLowerCase();
    }
    // Handle role update - only superadmin can change roles
    if (updateData.role && updateData.role !== user.role) {
        if (aReq.user.role !== "superadmin") {
            throw new apiError_1.default("Only superadmin can change user roles", 403);
        }
        // Cannot change your own role
        if (aReq.user.id === userId) {
            throw new apiError_1.default("You cannot change your own role", 400);
        }
    }
    // Update user
    Object.assign(user, updateData);
    await user.save({ validateModifiedOnly: true });
    // Remove sensitive fields
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshTokenHash;
    delete userResponse.refreshTokenExpiresAt;
    (0, apiResponse_1.ApiResponse)(res, 200, "User updated successfully", { user: userResponse });
});
// Delete user (deactivate)
exports.deleteUser = (0, asyncHandler_1.default)(async (req, res) => {
    const userId = req.params.id;
    const aReq = req;
    // Validate ObjectId
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        throw new apiError_1.default("Invalid user ID", 400);
    }
    // Cannot delete yourself
    if (aReq.user.id === userId) {
        throw new apiError_1.default("You cannot delete your own account", 400);
    }
    const user = await user_model_1.default.findById(userId);
    if (!user) {
        throw new apiError_1.default("User not found", 404);
    }
    // Check permission - only superadmin can delete admins
    if (user.role === "admin" && aReq.user.role !== "superadmin") {
        throw new apiError_1.default("Only superadmin can delete admin users", 403);
    }
    // Deactivate user instead of deleting
    user.active = false;
    await user.save();
    (0, apiResponse_1.ApiResponse)(res, 200, "User deactivated successfully");
});
// Change user role (superadmin only)
exports.changeUserRole = (0, asyncHandler_1.default)(async (req, res) => {
    const { userId, newRole } = req.body;
    console.log(req.body);
    const aReq = req;
    // Validate required fields
    if (!userId || !newRole) {
        throw new apiError_1.default("User ID and new role are required", 400);
    }
    // Only superadmin can change roles
    if (aReq.user.role !== "superadmin") {
        throw new apiError_1.default("Only superadmin can change user roles", 403);
    }
    // Validate userId is a valid ObjectId
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        throw new apiError_1.default("Invalid user ID", 400);
    }
    const user = await user_model_1.default.findById(userId);
    if (!user) {
        throw new apiError_1.default("User not found", 404);
    }
    // Cannot change your own role
    if (aReq.user.id === userId) {
        throw new apiError_1.default("You cannot change your own role", 400);
    }
    // Validate new role
    const allowedRoles = [
        "superadmin",
        "admin",
        "editor",
        "delivery",
        "user",
    ];
    if (!allowedRoles.includes(newRole)) {
        throw new apiError_1.default("Invalid role specified", 400);
    }
    user.role = newRole;
    await user.save();
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshTokenHash;
    delete userResponse.refreshTokenExpiresAt;
    (0, apiResponse_1.ApiResponse)(res, 200, "User role updated successfully", {
        user: userResponse,
    });
});
// Get system statistics (admin/superadmin only)
exports.getSystemStats = (0, asyncHandler_1.default)(async (req, res) => {
    const [totalUsers, activeUsers, superadmins, admins, editors, delivery, regularUsers,] = await Promise.all([
        user_model_1.default.countDocuments(),
        user_model_1.default.countDocuments({ active: true }),
        user_model_1.default.countDocuments({ role: "superadmin" }),
        user_model_1.default.countDocuments({ role: "admin" }),
        user_model_1.default.countDocuments({ role: "editor" }),
        user_model_1.default.countDocuments({ role: "delivery" }),
        user_model_1.default.countDocuments({ role: "user" }),
    ]);
    (0, apiResponse_1.ApiResponse)(res, 200, "System statistics retrieved", {
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
});
