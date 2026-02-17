import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as categoryService from "./category.service";
import { uploadToCloudinary } from "../../utils/cloudinary.util";

/**
 * Create category (raw)
 */
export const createCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, description, isActive } = req.body;

    let image;
    if (req.file) {
      image = await uploadToCloudinary(req.file.buffer);
    }

    const category = await categoryService.createCategory({
      name,
      description,
      isActive,
      ...(image && { image }),
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: { category },
    });
  },
);

/**
 * Get all categories
 */
export const getCategories = asyncHandler(
  async (_req: Request, res: Response) => {
    const categories = await categoryService.getAllCategories();

    res.status(200).json({
      success: true,
      count: categories.length,
      data: { categories },
    });
  },
);

/**
 * Get category by ID
 */
export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.getCategoryById(req.params.id);

  res.status(200).json({
    success: true,
    data: { category },
  });
});

/**
 * Update category
 */
export const updateCategory = asyncHandler(
  async (req: Request, res: Response) => {
    let image;
    if (req.file) {
      image = await uploadToCloudinary(req.file.buffer);
    }

    const category = await categoryService.updateCategory(req.params.id, {
      ...req.body,
      ...(image && { image }),
    });

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: { category },
    });
  },
);

/**
 * Delete category
 */
export const deleteCategory = asyncHandler(
  async (req: Request, res: Response) => {
    await categoryService.deleteCategory(req.params.id);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  },
);

/**
 * Seed hardcoded categories
 */
export const seedCategories = asyncHandler(
  async (_req: Request, res: Response) => {
    const categories = await categoryService.seedCategories();

    res.status(200).json({
      success: true,
      message: "Categories seeded successfully",
      data: { categories },
    });
  },
);

/**
 * Get hardcoded categories
 */
export const getHardcodedCategories = asyncHandler(
  async (_req: Request, res: Response) => {
    const categories = await categoryService.getHardcodedCategories();

    res.status(200).json({
      success: true,
      count: categories.length,
      data: { categories },
    });
  },
);
