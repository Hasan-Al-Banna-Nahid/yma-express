// src/controllers/category.controller.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/asyncHandler";
import * as categoryService from "../services/category.service";
import { uploadToCloudinary } from "../utils/cloudinary.util";

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
