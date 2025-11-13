"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.getCategory = exports.getCategories = exports.createCategory = void 0;
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const categoryService = __importStar(require("../services/category.service"));
const cloudinary_util_1 = require("../utils/cloudinary.util");
exports.createCategory = (0, asyncHandler_1.default)(async (req, res, next) => {
    let imageUrl;
    if (req.file) {
        imageUrl = await (0, cloudinary_util_1.uploadToCloudinary)(req.file);
    }
    const categoryData = {
        ...req.body,
        ...(imageUrl && { image: imageUrl }),
    };
    const category = await categoryService.createCategory(categoryData);
    res.status(201).json({
        status: "success",
        data: {
            category,
        },
    });
});
exports.getCategories = (0, asyncHandler_1.default)(async (req, res, next) => {
    const categories = await categoryService.getAllCategories();
    res.status(200).json({
        status: "success",
        results: categories.length,
        data: {
            categories,
        },
    });
});
exports.getCategory = (0, asyncHandler_1.default)(async (req, res, next) => {
    const category = await categoryService.getCategoryById(req.params.id);
    res.status(200).json({
        status: "success",
        data: {
            category,
        },
    });
});
exports.updateCategory = (0, asyncHandler_1.default)(async (req, res, next) => {
    let imageUrl;
    if (req.file) {
        imageUrl = await (0, cloudinary_util_1.uploadToCloudinary)(req.file);
    }
    const updateData = {
        ...req.body,
        ...(imageUrl && { image: imageUrl }),
    };
    const category = await categoryService.updateCategory(req.params.id, updateData);
    res.status(200).json({
        status: "success",
        data: {
            category,
        },
    });
});
exports.deleteCategory = (0, asyncHandler_1.default)(async (req, res, next) => {
    await categoryService.deleteCategory(req.params.id);
    res.status(204).json({
        status: "success",
        data: null,
    });
});
