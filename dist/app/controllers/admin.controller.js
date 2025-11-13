"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardDeleteUser = exports.softDeleteUser = exports.adminUpdateUser = exports.updateUserRole = exports.getUser = exports.listUsers = void 0;
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const apiResponse_1 = require("../utils/apiResponse");
const user_model_1 = __importDefault(require("../models/user.model"));
const apiError_1 = __importDefault(require("../utils/apiError"));
// GET /admin/users?search=&page=1&limit=20&sort=-createdAt
exports.listUsers = (0, asyncHandler_1.default)(async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const sort = String(req.query.sort || "-createdAt");
    const search = String(req.query.search || "").trim();
    const filter = search ? { $text: { $search: search } } : {};
    const [items, total] = await Promise.all([
        user_model_1.default.find(filter).sort(sort).skip(skip).limit(limit).lean(),
        user_model_1.default.countDocuments(filter),
    ]);
    (0, apiResponse_1.ApiResponse)(res, 200, "Users fetched", {
        items,
        total,
        page,
        pages: Math.ceil(total / limit),
    });
});
// GET /admin/users/:id
exports.getUser = (0, asyncHandler_1.default)(async (req, res) => {
    const user = await user_model_1.default.findById(req.params.id).lean();
    if (!user)
        throw new apiError_1.default("User not found", 404);
    (0, apiResponse_1.ApiResponse)(res, 200, "User fetched", { user });
});
// PATCH /admin/users/:id/role
exports.updateUserRole = (0, asyncHandler_1.default)(async (req, res) => {
    const { role } = req.body;
    if (!["user", "admin"].includes(role))
        throw new apiError_1.default("Invalid role", 400);
    const user = await user_model_1.default.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true }).lean();
    if (!user)
        throw new apiError_1.default("User not found", 404);
    (0, apiResponse_1.ApiResponse)(res, 200, "Role updated", { user });
});
// PATCH /admin/users/:id
exports.adminUpdateUser = (0, asyncHandler_1.default)(async (req, res) => {
    const { name, email, photo, active } = req.body;
    const user = await user_model_1.default.findByIdAndUpdate(req.params.id, { name, email, photo, active }, { new: true, runValidators: true }).lean();
    if (!user)
        throw new apiError_1.default("User not found", 404);
    (0, apiResponse_1.ApiResponse)(res, 200, "User updated", { user });
});
// DELETE /admin/users/:id (soft)
exports.softDeleteUser = (0, asyncHandler_1.default)(async (req, res) => {
    const user = await user_model_1.default.findByIdAndUpdate(req.params.id, { active: false }, { new: true }).lean();
    if (!user)
        throw new apiError_1.default("User not found", 404);
    (0, apiResponse_1.ApiResponse)(res, 200, "User soft-deleted", { user });
});
// DELETE /admin/users/:id/hard
exports.hardDeleteUser = (0, asyncHandler_1.default)(async (req, res) => {
    const user = await user_model_1.default.findByIdAndDelete(req.params.id).lean();
    if (!user)
        throw new apiError_1.default("User not found", 404);
    (0, apiResponse_1.ApiResponse)(res, 200, "User hard-deleted");
});
