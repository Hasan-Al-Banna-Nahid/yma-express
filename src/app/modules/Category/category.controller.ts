// src/controllers/category.controller.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as categoryService from "./category.service";
import { uploadToCloudinary } from "../../utils/cloudinary.util";
import Category from "../../modules/Category/category.model";

export const createCategory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
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
      status: "success",
      data: {
        category,
      },
    });
  }
);

export const getCategories = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const categories = await categoryService.getAllCategories();

    res.status(200).json({
      status: "success",
      results: categories.length,
      data: {
        categories,
      },
    });
  }
);

export const getCategory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const category = await categoryService.getCategoryById(req.params.id);

    res.status(200).json({
      status: "success",
      data: {
        category,
      },
    });
  }
);

export const updateCategory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let imageUrl;

    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file);
    }

    const updateData = {
      ...req.body,
      ...(imageUrl && { image: imageUrl }),
    };

    const category = await categoryService.updateCategory(
      req.params.id,
      updateData
    );

    res.status(200).json({
      status: "success",
      data: {
        category,
      },
    });
  }
);

export const deleteCategory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await categoryService.deleteCategory(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);
// Add this function to your existing category.controller.ts
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
      // Check if category already exists
      const existingCategory = await Category.findOne({
        name: categoryData.name,
      });

      if (!existingCategory) {
        const category = await Category.create({
          ...categoryData,
          isActive: true,
        });
        createdCategories.push(category);
      } else {
        createdCategories.push(existingCategory);
      }
    }

    res.status(200).json({
      success: true,
      message: "Categories seeded successfully",
      data: {
        categories: createdCategories,
      },
    });
  }
);

// Add this function to get all categories with optional photo
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
      data: {
        categories: categories.map((cat) => ({
          id: cat._id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          image: cat.image || null, // Optional photo from Cloudinary
          isActive: cat.isActive,
        })),
      },
    });
  }
);
