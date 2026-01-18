import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as categoryService from "./category.service";
import { uploadToCloudinary } from "../../utils/cloudinary.util";
import Category from "../../modules/Category/category.model";
import ApiError from "../../utils/apiError";

export const createCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { name } = req.body;

    // Check if category with same name already exists
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") }, // Case-insensitive match
    });

    if (existingCategory) {
      throw new ApiError(`Category with name "${name}" already exists`, 400);
    }

    let imageUrl;

    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file);
    }

    const categoryData = {
      ...req.body,
      ...(imageUrl && { image: imageUrl }),
    };

    const category = await categoryService.createCategory(categoryData);

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: { category },
    });
  }
);

export const getCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const categories = await categoryService.getAllCategories();

    res.status(200).json({
      success: true,
      count: categories.length,
      data: { categories },
    });
  }
);

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.getCategoryById(req.params.id);

  res.status(200).json({
    success: true,
    data: { category },
  });
});

export const updateCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;

    // If name is being updated, check for uniqueness
    if (name) {
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: id }, // Exclude current category from check
      });

      if (existingCategory) {
        throw new ApiError(`Category with name "${name}" already exists`, 400);
      }
    }

    let imageUrl;

    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file);
    }

    const updateData = {
      ...req.body,
      ...(imageUrl && { image: imageUrl }),
    };

    const category = await categoryService.updateCategory(id, updateData);

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: { category },
    });
  }
);

export const deleteCategory = asyncHandler(
  async (req: Request, res: Response) => {
    await categoryService.deleteCategory(req.params.id);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  }
);

export const seedCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const hardcodedCategories = [
      {
        name: "Garden Games",
        description: "Outdoor games and activities for garden fun",
      },
      {
        name: "Soft Play",
        description: "Soft and safe play equipment for children",
      },
      {
        name: "Bouncy Castle",
        description: "Inflatable castles and bouncy houses",
      },
      {
        name: "Fun Food",
        description: "Fun and creative food catering options",
      },
      {
        name: "Tower Castle",
        description: "Large tower-style castle structures",
      },
    ];

    const createdCategories = [];

    for (const categoryData of hardcodedCategories) {
      // Check if category already exists (case-insensitive)
      let category = await Category.findOne({
        name: { $regex: new RegExp(`^${categoryData.name}$`, "i") },
      });

      if (!category) {
        category = await Category.create({
          ...categoryData,
          isActive: true,
        });
      }

      createdCategories.push(category);
    }

    res.status(200).json({
      success: true,
      message: "Categories seeded successfully",
      data: { categories: createdCategories },
    });
  }
);

export const getHardcodedCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const categories = await Category.find({
      name: {
        $in: [
          "Garden Games",
          "Soft Play",
          "Bouncy Castle",
          "Fun Food",
          "Tower Castle",
        ],
      },
    });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: { categories },
    });
  }
);
