import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as blogService from "./blog.service";
import ApiError from "../../utils/apiError";
import { uploadToCloudinary } from "../../utils/cloudinary.util";

// Create blog
export const createBlog = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    subtitle,
    description,
    customField1,
    customField2,
    customField3,
    customField4,
    customField5,
    isPublished,
  } = req.body;

  // Upload images if provided
  let images: string[] = [];
  if (req.files && Array.isArray(req.files)) {
    for (const file of req.files as Express.Multer.File[]) {
      const imageUrl = await uploadToCloudinary(file);
      images.push(imageUrl);
    }
  }

  const blogData = {
    title,
    subtitle,
    description,
    images,
    customField1,
    customField2,
    customField3,
    customField4,
    customField5,
    isPublished: isPublished !== undefined ? isPublished : true,
  };

  const blog = await blogService.createBlog(blogData);

  res.status(201).json({
    success: true,
    message: "Blog created successfully",
    data: { blog },
  });
});

// Get all blogs with pagination
export const getAllBlogs = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const publishedOnly = req.query.published !== "false"; // Default true

  const result = await blogService.getAllBlogs(page, limit, publishedOnly);

  res.status(200).json({
    success: true,
    data: {
      blogs: result.blogs,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: result.pages,
      },
    },
  });
});

// Get blog by ID
export const getBlogById = asyncHandler(async (req: Request, res: Response) => {
  const blog = await blogService.getBlogById(req.params.id);

  res.status(200).json({
    success: true,
    data: { blog },
  });
});

// Get blog by slug
export const getBlogBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const blog = await blogService.getBlogBySlug(req.params.slug);

    res.status(200).json({
      success: true,
      data: { blog },
    });
  }
);

// Update blog
export const updateBlog = asyncHandler(async (req: Request, res: Response) => {
  const blogId = req.params.id;
  const updateData = req.body;

  // Handle image uploads
  if (req.files && Array.isArray(req.files)) {
    const images: string[] = [];
    for (const file of req.files as Express.Multer.File[]) {
      const imageUrl = await uploadToCloudinary(file);
      images.push(imageUrl);
    }
    updateData.images = images;
  }

  const blog = await blogService.updateBlog(blogId, updateData);

  res.status(200).json({
    success: true,
    message: "Blog updated successfully",
    data: { blog },
  });
});

// Delete blog
export const deleteBlog = asyncHandler(async (req: Request, res: Response) => {
  await blogService.deleteBlog(req.params.id);

  res.status(200).json({
    success: true,
    message: "Blog deleted successfully",
  });
});

// Search blogs
export const searchBlogs = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query.q as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  if (!query || query.trim().length < 2) {
    throw new ApiError("Search query must be at least 2 characters", 400);
  }

  const result = await blogService.searchBlogs(query.trim(), page, limit);

  res.status(200).json({
    success: true,
    data: {
      blogs: result.blogs,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: result.pages,
      },
    },
  });
});
// Add to your existing blog.controller.ts
export const togglePublishStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const blogId = req.params.id;
    const { isPublished } = req.body;

    if (isPublished === undefined) {
      throw new ApiError("isPublished field is required", 400);
    }

    if (typeof isPublished !== "boolean") {
      throw new ApiError("isPublished must be a boolean", 400);
    }

    const blog = await blogService.togglePublishStatus(blogId, isPublished);

    res.status(200).json({
      success: true,
      message: `Blog ${isPublished ? "published" : "unpublished"} successfully`,
      data: { blog },
    });
  }
);
