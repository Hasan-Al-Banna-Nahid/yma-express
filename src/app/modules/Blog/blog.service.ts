import Blog, { IBlogModel } from "./blog.model";
import ApiError from "../../utils/apiError";
import { Types } from "mongoose";
import { CreateBlogData, UpdateBlogData, BlogFilter } from "./blog.interface";
export const createBlog = async (blogData: any): Promise<any> => {
  const blog = await Blog.create(blogData);
  return blog;
};

export const getAllBlogs = async (
  filters: any = {},
  page: number = 1,
  limit: number = 10
): Promise<{
  blogs: IBlogModel[];
  total: number;
  pages: number;
}> => {
  const skip = (page - 1) * limit;
  const query: any = {};

  // BLOG NAME FILTER (search by title)
  if (filters.name) {
    query.title = { $regex: filters.name, $options: "i" };
  }

  // CATEGORY FILTER
  if (filters.category) {
    query.category = filters.category;
  }

  // IS PUBLISHED FILTER
  if (filters.isPublished !== undefined) {
    if (filters.isPublished === "true" || filters.isPublished === true) {
      query.status = "published";
      query.publishedAt = { $lte: new Date() };
    } else if (
      filters.isPublished === "false" ||
      filters.isPublished === false
    ) {
      query.status = { $ne: "published" };
    }
  }

  // Get total count
  const total = await Blog.countDocuments(query);

  // Get blogs with pagination
  const blogs = await Blog.find(query)
    .populate("author", "name email avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

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
  const blog = await Blog.findOne({ slug })
    .populate("author", "name email avatar")
    .lean();

  if (!blog) {
    throw new ApiError("Blog not found", 404);
  }

  // Increment views
  await Blog.findOneAndUpdate({ slug }, { $inc: { views: 1 } });

  return blog as IBlogModel;
};

export const updateBlog = async (
  blogId: string,
  updateData: any
): Promise<any> => {
  const blog = await Blog.findByIdAndUpdate(blogId, updateData, {
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
  limit: number = 10
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
  status: string
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
                  1
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
