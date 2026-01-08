import { Types } from "mongoose";

export interface IBlog {
  _id?: Types.ObjectId;
  title: string;
  subtitle?: string;
  description: string;
  images?: string[];
  customField1?: string;
  customField2?: string;
  customField3?: string;
  customField4?: string;
  customField5?: string;
  isPublished?: boolean;
  views?: number;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateBlogData {
  title: string;
  subtitle?: string;
  description: string;
  images?: string[];
  customField1?: string;
  customField2?: string;
  customField3?: string;
  customField4?: string;
  customField5?: string;
  isPublished?: boolean;
}

export interface UpdateBlogData {
  title?: string;
  subtitle?: string;
  description?: string;
  images?: string[];
  customField1?: string;
  customField2?: string;
  customField3?: string;
  customField4?: string;
  customField5?: string;
  isPublished?: boolean;
}

export interface BlogListResponse {
  blogs: IBlog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
