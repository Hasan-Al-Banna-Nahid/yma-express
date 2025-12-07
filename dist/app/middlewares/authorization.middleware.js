"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canManageUser = exports.restrictTo = void 0;
const apiError_1 = __importDefault(require("../utils/apiError"));
const mongoose_1 = __importDefault(require("mongoose"));
// Restrict access to specific roles
const restrictTo = (...allowedRoles) => {
    return (req, _res, next) => {
        const aReq = req;
        if (!aReq.user) {
            return next(new apiError_1.default("You are not logged in", 401));
        }
        if (!allowedRoles.includes(aReq.user.role)) {
            return next(new apiError_1.default("You do not have permission to perform this action", 403));
        }
        next();
    };
};
exports.restrictTo = restrictTo;
// Check if user can manage another user
const canManageUser = (req, _res, next) => {
    const aReq = req;
    if (!aReq.user) {
        return next(new apiError_1.default("You are not logged in", 401));
    }
    const targetUserId = req.params.id;
    // Skip if this is not a user ID route (like /change-role)
    if (!targetUserId || targetUserId === "change-role") {
        return next();
    }
    // Validate ObjectId
    if (!mongoose_1.default.Types.ObjectId.isValid(targetUserId)) {
        return next(new apiError_1.default("Invalid user ID", 400));
    }
    // Only superadmin can manage other admins/superadmins
    if (aReq.user.role !== "superadmin") {
        return next(new apiError_1.default("Only superadmin can manage this user", 403));
    }
    next();
};
exports.canManageUser = canManageUser;
