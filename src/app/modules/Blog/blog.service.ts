import Blog, { IBlogModel } from "./blog.model";
import ApiError from "../../utils/apiError";
import { Types } from "mongoose";
import { CreateBlogData, UpdateBlogData } from "./blog.interface";

export const createBlog = async (
  blogData: CreateBlogData
): Promise<IBlogModel> => {
  const blog = await Blog.create(blogData);
  return blog;
};

export const getAllBlogs = async (
  page: number = 1,
  limit: number = 10,
  publishedOnly: boolean = true
): Promise<{
  blogs: IBlogModel[];
  total: number;
  pages: number;
}> => {
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (publishedOnly) {
    filter.isPublished = true;
  }

  const [blogs, total] = await Promise.all([
    Blog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Blog.countDocuments(filter),
  ]);

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

  const blog = await Blog.findById(blogId).lean();

  if (!blog) {
    throw new ApiError("Blog not found", 404);
  }

  // Increment views
  await Blog.findByIdAndUpdate(blogId, { $inc: { views: 1 } });

  return blog as IBlogModel;
};

export const getBlogBySlug = async (slug: string): Promise<IBlogModel> => {
  const blog = await Blog.findOne({ slug }).lean();

  if (!blog) {
    throw new ApiError("Blog not found", 404);
  }

  // Increment views
  await Blog.findOneAndUpdate({ slug }, { $inc: { views: 1 } });

  return blog as IBlogModel;
};

export const updateBlog = async (
  blogId: string,
  updateData: UpdateBlogData
): Promise<IBlogModel> => {
  if (!Types.ObjectId.isValid(blogId)) {
    throw new ApiError("Invalid blog ID", 400);
  }

  const blog = await Blog.findByIdAndUpdate(blogId, updateData, {
    new: true,
    runValidators: true,
  }).lean();

  if (!blog) {
    throw new ApiError("Blog not found", 404);
  }

  return blog as IBlogModel;
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
    isPublished: true,
    $or: [
      { title: { $regex: query, $options: "i" } },
      { subtitle: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ],
  };

  const [blogs, total] = await Promise.all([
    Blog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Blog.countDocuments(filter),
  ]);

  return {
    blogs: blogs as IBlogModel[],
    total,
    pages: Math.ceil(total / limit),
  };
};
// Add to your existing blog.service.ts
export const togglePublishStatus = async (
  blogId: string,
  isPublished: boolean
): Promise<IBlogModel> => {
  if (!Types.ObjectId.isValid(blogId)) {
    throw new ApiError("Invalid blog ID", 400);
  }

  const blog = await Blog.findByIdAndUpdate(
    blogId,
    { isPublished },
    { new: true, runValidators: true }
  ).lean();

  if (!blog) {
    throw new ApiError("Blog not found", 404);
  }

  return blog as IBlogModel;
};
