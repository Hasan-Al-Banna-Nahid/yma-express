import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as blogService from "./blog.service";
import ApiError from "../../utils/apiError";
import { uploadToCloudinary } from "../../utils/cloudinary.util";
import { BlogFilter } from "./blog.interface";

// Create blog
export const createBlog = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    subtitle,
    description,
    author,
    category,
    tags,
    status,
    scheduledAt,
    customField1,
    customField2,
    customField3,
    customField4,
    customField5,
    isFeatured,
    seoTitle,
    seoDescription,
    seoKeywords,
  } = req.body;

  // Parse tags if string
  let parsedTags: string[] = [];
  if (tags) {
    if (typeof tags === "string") {
      parsedTags = tags.split(",").map((tag) => tag.trim());
    } else if (Array.isArray(tags)) {
      parsedTags = tags;
    }
  }

  // Parse SEO keywords
  let parsedSeoKeywords: string[] = [];
  if (seoKeywords) {
    if (typeof seoKeywords === "string") {
      parsedSeoKeywords = seoKeywords
        .split(",")
        .map((keyword) => keyword.trim());
    } else if (Array.isArray(seoKeywords)) {
      parsedSeoKeywords = seoKeywords;
    }
  }

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
    author: author || (req as any).user?._id,
    category,
    tags: parsedTags,
    status: status || "draft",
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    customField1,
    customField2,
    customField3,
    customField4,
    customField5,
    isFeatured: isFeatured === "true" || isFeatured === true,
    seoTitle,
    seoDescription,
    seoKeywords: parsedSeoKeywords,
  };

  const blog = await blogService.createBlog(blogData);

  res.status(201).json({
    success: true,
    message: "Blog created successfully",
    data: { blog },
  });
});

// Get all blogs with filters and pagination
export const getAllBlogs = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  // Build filters from query params
  const filters: BlogFilter = {};

  // Status filter
  if (req.query.status) {
    filters.status = req.query.status as any;
  }

  // Category filter
  if (req.query.category) {
    filters.category = req.query.category as string;
  }

  // Author filter
  if (req.query.author) {
    filters.author = req.query.author as string;
  }

  // Tags filter
  if (req.query.tags) {
    const tags = req.query.tags as string;
    filters.tags = tags.split(",").map((tag) => tag.trim());
  }

  // Featured filter
  if (req.query.featured) {
    filters.isFeatured = req.query.featured === "true";
  }

  // Search filter
  if (req.query.search) {
    filters.search = req.query.search as string;
  }

  // Date range filters
  if (req.query.startDate) {
    filters.startDate = new Date(req.query.startDate as string);
  }
  if (req.query.endDate) {
    filters.endDate = new Date(req.query.endDate as string);
  }

  // Published only filter (default true for public)
  if (req.query.publishedOnly !== undefined) {
    filters.publishedOnly = req.query.publishedOnly === "true";
  }

  const result = await blogService.getAllBlogs(filters, page, limit);

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
      filters: {
        status: filters.status,
        category: filters.category,
        search: filters.search,
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

  // Parse tags if provided
  if (updateData.tags) {
    if (typeof updateData.tags === "string") {
      updateData.tags = updateData.tags
        .split(",")
        .map((tag: string) => tag.trim());
    }
  }

  // Parse SEO keywords if provided
  if (updateData.seoKeywords) {
    if (typeof updateData.seoKeywords === "string") {
      updateData.seoKeywords = updateData.seoKeywords
        .split(",")
        .map((keyword: string) => keyword.trim());
    }
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

// Toggle publish status
export const togglePublishStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const blogId = req.params.id;
    const { status } = req.body;

    if (
      !status ||
      !["draft", "published", "archived", "scheduled"].includes(status)
    ) {
      throw new ApiError(
        "Valid status is required (draft, published, archived, scheduled)",
        400
      );
    }

    const blog = await blogService.togglePublishStatus(blogId, status);

    res.status(200).json({
      success: true,
      message: `Blog status updated to ${status}`,
      data: { blog },
    });
  }
);

// Get blog statistics
export const getBlogStats = asyncHandler(
  async (req: Request, res: Response) => {
    const stats = await blogService.getBlogStats();

    res.status(200).json({
      success: true,
      data: { stats },
    });
  }
);
