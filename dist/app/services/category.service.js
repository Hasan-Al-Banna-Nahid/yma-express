"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.getCategoryById = exports.getAllCategories = exports.createCategory = void 0;
// src/services/category.service.ts
const category_model_1 = __importDefault(require("../models/category.model"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const createCategory = async (categoryData) => {
    const category = await category_model_1.default.create(categoryData);
    return category;
};
exports.createCategory = createCategory;
const getAllCategories = async () => {
    const categories = await category_model_1.default.find({ isActive: true });
    return categories;
};
exports.getAllCategories = getAllCategories;
const getCategoryById = async (id) => {
    const category = await category_model_1.default.findById(id);
    if (!category) {
        throw new apiError_1.default("Category not found", 404);
    }
    return category;
};
exports.getCategoryById = getCategoryById;
const updateCategory = async (id, updateData) => {
    const category = await category_model_1.default.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    });
    if (!category) {
        throw new apiError_1.default("Category not found", 404);
    }
    return category;
};
exports.updateCategory = updateCategory;
const deleteCategory = async (id) => {
    const category = await category_model_1.default.findByIdAndDelete(id);
    if (!category) {
        throw new apiError_1.default("Category not found", 404);
    }
};
exports.deleteCategory = deleteCategory;
