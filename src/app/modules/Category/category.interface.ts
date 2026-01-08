import { Types } from "mongoose";

export interface ICategory {
  _id?: Types.ObjectId;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateCategoryData {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface UpdateCategoryData {
  name?: string;
  slug?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}
// Add to your existing category.interface.ts
export interface HardcodedCategory {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string | null; // Optional photo from Cloudinary
  isActive?: boolean;
}

export interface SeedCategoriesResponse {
  success: boolean;
  message: string;
  data: {
    categories: ICategory[];
  };
}
