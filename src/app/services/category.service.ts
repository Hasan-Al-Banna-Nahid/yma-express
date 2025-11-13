// src/services/category.service.ts
import Category, { ICategoryModel } from "../models/category.model";
import ApiError from "../utils/apiError";

export const createCategory = async (
  categoryData: Partial<ICategoryModel>
): Promise<ICategoryModel> => {
  const category = await Category.create(categoryData);
  return category;
};

export const getAllCategories = async (): Promise<ICategoryModel[]> => {
  const categories = await Category.find({ isActive: true });
  return categories;
};

export const getCategoryById = async (
  id: string
): Promise<ICategoryModel | null> => {
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError("Category not found", 404);
  }
  return category;
};

export const updateCategory = async (
  id: string,
  updateData: Partial<ICategoryModel>
): Promise<ICategoryModel | null> => {
  const category = await Category.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
  if (!category) {
    throw new ApiError("Category not found", 404);
  }
  return category;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    throw new ApiError("Category not found", 404);
  }
};
