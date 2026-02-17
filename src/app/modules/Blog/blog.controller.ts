import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as blogService from "./blog.service";
import ApiError from "../../utils/apiError";

// Create Blog
export const createBlog = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    description,
    subtitle,
    authorName,
    status,
    customField1,
    customField2,
    customField3,
    customField4,
    customField5,
    customField6,
    customField7,
    customField8,
    metaTitle,
    metaDescription,
    imageAltText,
  } = req.body;

  // Handle file uploads
  let blogImages: string[] = [];
  let authorImage: string = "";

  if (req.files) {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Author image
    if (files["authorImage"] && files["authorImage"][0]) {
      authorImage = files["authorImage"][0].path;
    }

    // Blog images
    if (files["images"]) {
      blogImages = files["images"].map((file) => file.path);
    }
  }

  const blogData = {
    title,
    description,
    subtitle,
    authorName,
    authorImage,
    images: blogImages,
    status: status || "draft",
    customField1: customField1 || "",
    customField2: customField2 || "",
    customField3: customField3 || "",
    customField4: customField4 || "",
    customField5: customField5 || "",
    customField6: customField6 || "",
    customField7: customField7 || "",
    customField8: customField8 || "",
    metaTitle: metaTitle || "",
    metaDescription: metaDescription || "",
    imageAltText: imageAltText || "",
  };

  const blog = await blogService.createBlog(blogData);

  res.status(201).json({
    success: true,
    message: "Blog created successfully",
    data: { blog },
  });
});

// Update Blog
export const updateBlog = asyncHandler(async (req: Request, res: Response) => {
  const blogId = req.params.id;
  const updateData = { ...req.body }; // Clone body to avoid mutation

  if (req.files) {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Replace author image if new one uploaded
    if (files["authorImage"] && files["authorImage"][0]) {
      updateData.authorImage = files["authorImage"][0].path;
    }

    // Replace blog images entirely if new images uploaded
    if (files["images"] && files["images"].length > 0) {
      updateData.images = files["images"].map((file) => file.path);
    }
  }

  const blog = await blogService.updateBlog(blogId, updateData);

  res.status(200).json({
    success: true,
    message: "Blog updated successfully",
    data: { blog },
  });
});

// Get All Blogs
export const getAllBlogs = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const filters: any = {};

  if (req.query.status && req.query.status !== "all") {
    filters.status = req.query.status;
  }
  if (req.query.category) filters.category = req.query.category;
  if (req.query.author) filters.author = req.query.author;
  if (req.query.tags) {
    filters.tags = (req.query.tags as string)
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }
  if (req.query.featured !== undefined) {
    filters.isFeatured = req.query.featured === "true";
  }
  if (req.query.search || req.query.name || req.query.q) {
    filters.search = (req.query.search ||
      req.query.name ||
      req.query.q) as string;
  }

  if (req.query.startDate)
    filters.startDate = new Date(req.query.startDate as string);
  if (req.query.endDate)
    filters.endDate = new Date(req.query.endDate as string);

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
      filters,
    },
  });
});

// Get Blog by ID
export const getBlogById = asyncHandler(async (req: Request, res: Response) => {
  const blog = await blogService.getBlogById(req.params.id);
  res.status(200).json({ success: true, data: { blog } });
});

// Get Blog by Slug
export const getBlogBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const blog = await blogService.getBlogBySlug(req.params.slug);
    res.status(200).json({ success: true, data: { blog } });
  },
);

// Delete Blog
export const deleteBlog = asyncHandler(async (req: Request, res: Response) => {
  await blogService.deleteBlog(req.params.id);
  res.status(200).json({ success: true, message: "Blog deleted successfully" });
});

// Search Blogs
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

// Toggle Publish Status
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
        400,
      );
    }

    const blog = await blogService.togglePublishStatus(blogId, status);

    res.status(200).json({
      success: true,
      message: `Blog status updated to ${status}`,
      data: { blog },
    });
  },
);

// Get Blog Statistics
export const getBlogStats = asyncHandler(
  async (req: Request, res: Response) => {
    const stats = await blogService.getBlogStats();
    res.status(200).json({ success: true, data: { stats } });
  },
);
