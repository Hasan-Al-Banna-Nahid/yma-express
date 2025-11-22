// src/interfaces/product.interface.ts
import { Types } from "mongoose";

export interface IProduct {
  _id?: Types.ObjectId;
  name: string;
  description: string;
  summary?: string;
  price: number;
  priceDiscount?: number;
  duration: number;
  maxGroupSize: number;
  difficulty: "easy" | "medium" | "difficult";
  categories: Types.ObjectId[];
  images: string[];
  imageCover: string;
  location: {
    country: string;
    state: string;
    city?: string;
  };
  dimensions: {
    length: number; // in feet
    width: number; // in feet
    height: number; // in feet
  };
  availableFrom: Date;
  availableUntil: Date;
  size?: string;
  active: boolean;
  stock: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ProductDifficulty = "easy" | "medium" | "difficult";

export interface CreateProductData {
  name: string;
  description: string;
  summary?: string;
  price: number;
  priceDiscount?: number;
  duration: number;
  maxGroupSize: number;
  difficulty: "easy" | "medium" | "difficult";
  categories: string[];
  images: string[];
  imageCover: string;
  location: {
    state: string;
    city?: string;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  availableFrom: string | Date;
  availableUntil: string | Date;
  size?: string;
  active?: boolean;
  stock: number;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  summary?: string;
  price?: number;
  priceDiscount?: number;
  duration?: number;
  maxGroupSize?: number;
  difficulty?: "easy" | "medium" | "difficult";
  categories?: string[];
  images?: string[];
  imageCover?: string;
  location?: {
    state?: string;
    city?: string;
  };
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  availableFrom?: string | Date;
  availableUntil?: string | Date;
  size?: string;
  active?: boolean;
  stock?: number;
}
