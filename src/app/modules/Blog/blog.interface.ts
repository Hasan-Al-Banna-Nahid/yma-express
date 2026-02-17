import { Types } from "mongoose";

export type BlogStatus = "draft" | "published" | "archived" | "scheduled";
export interface IAuthor {
  _id?: Types.ObjectId;
  name: string;
  email?: string;
  avatar?: string;
  profilePicture?: string;
  bio?: string;
}
export interface IBlog {
  _id?: Types.ObjectId;
  title: string;
  author?: Types.ObjectId | IAuthor;

  subtitle?: string;
  description: string;
  images?: string[];
  category?: string;
  tags?: string[];
  status: BlogStatus;
  publishedAt?: Date;
  scheduledAt?: Date;
  customField1?: string;
  customField2?: string;
  customField3?: string;
  customField4?: string;
  customField5?: string;
  customField6?: string;
  customField7?: string;
  customField8?: string;
  isFeatured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  metaTitle?: string;
  metaDescription?: string;
  imageAltText?: string;
  views?: number;
  slug?: string;
  readTime?: number;
  createdAt?: Date;
  updatedAt?: Date;
  authorName?: string;
  authorImage?: string;
}

export interface CreateBlogData {
  title: string;
  subtitle?: string;
  description: string;
  images?: string[];
  author?: string;
  category?: string;
  tags?: string[];
  status?: BlogStatus;
  scheduledAt?: Date;
  customField1?: string;
  customField2?: string;
  customField3?: string;
  customField4?: string;
  customField5?: string;
  isFeatured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  metaTitle?: string;
  metaDescription?: string;
  imageAltText?: string;
}

export interface UpdateBlogData {
  title?: string;
  subtitle?: string;
  description?: string;
  images?: string[];
  author?: string;
  category?: string;
  tags?: string[];
  status?: BlogStatus;
  publishedAt?: Date;
  scheduledAt?: Date;
  customField1?: string;
  customField2?: string;
  customField3?: string;
  customField4?: string;
  customField5?: string;
  isFeatured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  metaTitle?: string;
  metaDescription?: string;
  imageAltText?: string;
}

export interface BlogFilter {
  status?: BlogStatus | "all";
  category?: string;
  author?: string;
  tags?: string[];
  isFeatured?: boolean;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  publishedOnly?: boolean;
}

export interface BlogListResponse {
  blogs: IBlog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    status?: string;
    category?: string;
    search?: string;
  };
}
