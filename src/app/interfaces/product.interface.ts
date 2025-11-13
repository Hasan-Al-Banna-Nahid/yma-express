// src/interfaces/product.interface.ts
import mongoose from "mongoose";

export interface IProduct {
  name: string;
  description: string;
  summary?: string;
  price: number;
  priceDiscount?: number;
  duration: number;
  maxGroupSize: number;
  difficulty: "easy" | "medium" | "difficult";
  categories: mongoose.Types.ObjectId[];
  images: string[];
  imageCover: string;
  location: mongoose.Types.ObjectId;
  availableFrom: Date;
  availableUntil: Date;
  size?: string; // New size field
  isActive?: boolean;
  active: boolean;
  createdAt?: Date;
  stock: number;
}
