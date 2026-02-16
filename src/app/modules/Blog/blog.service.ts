import Blog, { IBlogModel } from "./blog.model";
import ApiError from "../../utils/apiError";
import { Types } from "mongoose";
import { CreateBlogData, UpdateBlogData, BlogFilter } from "./blog.interface";

const toSlug = (value?: string | null) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createBlog = async (blogData: any): Promise<any> => {
  console.log("Service creating blog with:", blogData); // Debug log
  const blog = await Blog.create(blogData);
  console.log("Blog created:", blog); // Debug log
  return blog;
};

export const getAllBlogs = async (
  filters: BlogFilter = {},
  page: number = 1,
  limit: number = 10,
): Promise<{
  blogs: IBlogModel[];
  total: number;
  pages: number;
}> => {
  const skip = (page - 1) * limit;
  let query: any = {};

  console.log("=== SERVICE DEBUG START ===");
  console.log("Received filters:", filters);

  // STATUS FILTER
  if (filters.status && filters.status !== "all") {
    query.status = filters.status;
    console.log(`Applied status filter: ${filters.status}`);
  }

  // PUBLISHED ONLY FILTER
  if (filters.publishedOnly) {
    console.log("Applying publishedOnly filter");

    // Complex query to handle all published cases:
    // 1. status = 'published'
    // 2. OR isPublished = true
    // 3. OR publishedAt exists and is in the past
    query.$or = [
      { status: "published" },
      { isPublished: true },
      {
        publishedAt: {
          $exists: true,
          $lte: new Date(),
        },
      },
    ];
  }

  // CATEGORY FILTER
  if (filters.category) {
    query.category = filters.category;
    console.log(`Applied category filter: ${filters.category}`);
  }

  // AUTHOR FILTER - Handle both author reference and authorName
  if (filters.author) {
    console.log(`Applying author filter: ${filters.author}`);

    // Try to parse as ObjectId first
    if (Types.ObjectId.isValid(filters.author)) {
      query.$or = [
        { author: new Types.ObjectId(filters.author) },
        { authorName: { $regex: filters.author, $options: "i" } },
      ];
    } else {
      // Search in authorName or populated author name
      const authorRegex = new RegExp(filters.author, "i");
      query.$or = [
        { authorName: authorRegex },
        // Note: To search in populated author, we need aggregation
      ];
    }
  }

  // TAGS FILTER
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
    console.log(`Applied tags filter: ${filters.tags.join(", ")}`);
  }

  // FEATURED FILTER
  if (filters.isFeatured !== undefined) {
    query.isFeatured = filters.isFeatured;
    console.log(`Applied featured filter: ${filters.isFeatured}`);
  }

  // SEARCH FILTER - Most important!
  if (filters.search) {
    console.log(`Applying search filter: "${filters.search}"`);
    const searchRegex = new RegExp(filters.search, "i");

    const searchConditions = {
      $or: [
        { title: searchRegex },
        { subtitle: searchRegex },
        { description: searchRegex },
        { authorName: searchRegex },
        { "author.name": searchRegex }, // For populated authors
      ],
    };

    // Combine with existing query if any
    if (Object.keys(query).length > 0) {
      // If query already has $or, we need to handle it specially
      if (query.$or) {
        query = {
          $and: [{ $or: query.$or }, searchConditions],
        };
      } else {
        query = {
          $and: [query, searchConditions],
        };
      }
    } else {
      query = searchConditions;
    }
  }

  // DATE RANGE FILTERS
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = filters.startDate;
    }
    if (filters.endDate) {
      query.createdAt.$lte = filters.endDate;
    }
    console.log(
      `Applied date range: ${filters.startDate} to ${filters.endDate}`,
    );
  }

  console.log("Final query:", JSON.stringify(query, null, 2));

  // Build the aggregation pipeline for better searching
  const aggregationPipeline: any[] = [];

  // Match stage
  aggregationPipeline.push({ $match: query });

  // Lookup author if needed
  aggregationPipeline.push({
    $lookup: {
      from: "users", // Change to your actual user collection name
      localField: "author",
      foreignField: "_id",
      as: "authorDetails",
    },
  });

  // Add author name for consistent searching
  aggregationPipeline.push({
    $addFields: {
      effectiveAuthorName: {
        $cond: {
          if: {
            $and: [
              { $ifNull: ["$authorName", false] },
              { $ne: ["$authorName", ""] },
            ],
          },
          then: "$authorName",
          else: { $arrayElemAt: ["$authorDetails.name", 0] },
        },
      },
    },
  });

  // Apply search on effectiveAuthorName if search filter exists
  if (filters.search) {
    const searchRegex = new RegExp(filters.search, "i");
    aggregationPipeline.push({
      $match: {
        $or: [
          { title: searchRegex },
          { subtitle: searchRegex },
          { description: searchRegex },
          { effectiveAuthorName: searchRegex },
        ],
      },
    });
  }

  // Get total count
  const countPipeline = [...aggregationPipeline, { $count: "total" }];
  const countResult = await Blog.aggregate(countPipeline);
  const total = countResult[0]?.total || 0;

  // Add pagination and sorting
  aggregationPipeline.push(
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        title: 1,
        subtitle: 1,
        description: 1,
        images: 1,
        category: 1,
        tags: 1,
        status: 1,
        publishedAt: 1,
        isFeatured: 1,
        views: 1,
        slug: 1,
        readTime: 1,
        createdAt: 1,
        updatedAt: 1,
        authorName: 1,
        authorImage: 1,
        author: { $arrayElemAt: ["$authorDetails", 0] },
        // Include all custom fields
        customField1: 1,
        customField2: 1,
        customField3: 1,
        customField4: 1,
        customField5: 1,
        customField6: 1,
        customField7: 1,
        customField8: 1,
      },
    },
  );

  const blogs = await Blog.aggregate(aggregationPipeline);

  console.log(`Found ${blogs.length} blogs out of ${total} total`);
  blogs.forEach((blog, index) => {
    console.log(
      `${index + 1}. "${blog.title}" - Status: ${blog.status}, Author: ${blog.authorName || blog.author?.name}`,
    );
  });
  console.log("=== SERVICE DEBUG END ===\n");

  return {
    blogs: blogs as IBlogModel[],
    total,
    pages: Math.ceil(total / limit),
  };
};

export const getBlogById = async (blogId: string): Promise<IBlogModel> => {
  if (!Types.ObjectId.isValid(blogId)) {
    throw new ApiError("Invalid blog ID", 400);
  }

  const blog = await Blog.findById(blogId)
    .populate("author", "name email avatar")
    .lean();

  if (!blog) {
    throw new ApiError("Blog not found", 404);
  }

  // Increment views
  await Blog.findByIdAndUpdate(blogId, { $inc: { views: 1 } });

  return blog as IBlogModel;
};

export const getBlogBySlug = async (slug: string): Promise<IBlogModel> => {
  const normalized = toSlug(slug);

  let blog = await Blog.findOne({ slug: normalized })
    .populate("author", "name email avatar")
    .lean();

  if (!blog && normalized) {
    const normalizedName = normalized.replace(/-/g, " ");
    const fallbackMatches = await Blog.find({
      title: { $regex: new RegExp(`^${escapeRegex(normalizedName)}$`, "i") },
    })
      .populate("author", "name email avatar")
      .lean();

    blog =
      fallbackMatches.find(
        (item: any) => toSlug(String(item?.title || "")) === normalized,
      ) ??
      fallbackMatches[0] ??
      null;
  }

  if (!blog) {
    throw new ApiError("Blog not found", 404);
  }

  // Increment views
  await Blog.findByIdAndUpdate((blog as any)._id, { $inc: { views: 1 } });

  return blog as IBlogModel;
};

export const updateBlog = async (
  blogId: string,
  updateData: any,
): Promise<any> => {
  console.log("Updating blog with:", updateData); // Debug log

  // Clean updateData - remove undefined fields
  const cleanUpdateData: any = {};
  for (const [key, value] of Object.entries(updateData)) {
    if (value !== undefined && value !== null && value !== "") {
      cleanUpdateData[key] = value;
    }
  }

  console.log("Clean update data:", cleanUpdateData); // Debug log

  const blog = await Blog.findByIdAndUpdate(blogId, cleanUpdateData, {
    new: true,
    runValidators: true,
  });

  if (!blog) {
    throw new Error("Blog not found");
  }

  return blog;
};

export const deleteBlog = async (blogId: string): Promise<void> => {
  if (!Types.ObjectId.isValid(blogId)) {
    throw new ApiError("Invalid blog ID", 400);
  }

  const blog = await Blog.findByIdAndDelete(blogId);

  if (!blog) {
    throw new ApiError("Blog not found", 404);
  }
};

export const searchBlogs = async (
  query: string,
  page: number = 1,
  limit: number = 10,
): Promise<{
  blogs: IBlogModel[];
  total: number;
  pages: number;
}> => {
  const skip = (page - 1) * limit;

  const filter = {
    $or: [
      { title: { $regex: query, $options: "i" } },
      { subtitle: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
      { tags: { $regex: query, $options: "i" } },
    ],
    status: "published",
    publishedAt: { $lte: new Date() },
  };

  const [blogs, total] = await Promise.all([
    Blog.find(filter)
      .populate("author", "name email avatar")
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Blog.countDocuments(filter),
  ]);

  return {
    blogs: blogs as IBlogModel[],
    total,
    pages: Math.ceil(total / limit),
  };
};

export const togglePublishStatus = async (
  blogId: string,
  status: string,
): Promise<IBlogModel> => {
  if (!Types.ObjectId.isValid(blogId)) {
    throw new ApiError("Invalid blog ID", 400);
  }

  const updateData: any = { status };

  // Set publishedAt when publishing
  if (status === "published") {
    updateData.publishedAt = new Date();
  }

  const blog = await Blog.findByIdAndUpdate(blogId, updateData, {
    new: true,
    runValidators: true,
  })
    .populate("author", "name email avatar")
    .lean();

  if (!blog) {
    throw new ApiError("Blog not found", 404);
  }

  return blog as IBlogModel;
};

export const getBlogStats = async () => {
  const stats = await Blog.aggregate([
    {
      $facet: {
        statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        categoryCounts: [
          { $match: { category: { $exists: true, $ne: null } } },
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ],
        totalViews: [{ $group: { _id: null, total: { $sum: "$views" } } }],
        monthlyStats: [
          {
            $match: {
              status: "published",
              publishedAt: {
                $gte: new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  1,
                ),
              },
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              views: { $sum: "$views" },
            },
          },
        ],
      },
    },
  ]);

  return {
    statusCounts: stats[0]?.statusCounts || [],
    categoryCounts: stats[0]?.categoryCounts || [],
    totalViews: stats[0]?.totalViews[0]?.total || 0,
    monthlyStats: stats[0]?.monthlyStats[0] || { count: 0, views: 0 },
  };
};
