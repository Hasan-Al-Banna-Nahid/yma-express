import { Types } from "mongoose";

export interface IProduct {
  _id?: Types.ObjectId;
  name: string;
  description: string;
  summary?: string;
  price: number;
  perDayPrice?: number;
  perWeekPrice?: number;
  deliveryAndCollection: string;
  priceDiscount?: number;
  duration: number;
  maxGroupSize: number;
  difficulty: "easy" | "medium" | "difficult";
  categories: Types.ObjectId[]; // Changed from string[] to Types.ObjectId[]
  images: string[];
  imageCover: string;
  location: {
    country: "England";
    state: string;
    city?: string;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  availableFrom: Date;
  availableUntil: Date;
  size?: string;
  active: boolean;
  stock: number;
  isSensitive: boolean;
  material: string;
  design: string;
  ageRange: {
    min: number;
    max: number;
    unit: "years" | "months";
  };
  safetyFeatures: string[];
  qualityAssurance: {
    isCertified: boolean;
    certification?: string;
    warrantyPeriod?: number;
    warrantyDetails?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateProductData {
  name: string;
  description: string;
  summary?: string;
  price: number;
  perDayPrice?: number;
  perWeekPrice?: number;
  deliveryAndCollection: string;
  priceDiscount?: number;
  duration: number;
  maxGroupSize: number;
  difficulty: "easy" | "medium" | "difficult";
  categories: string[]; // Accept string IDs from request
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
  availableFrom: Date | string;
  availableUntil: Date | string;
  size?: string;
  active?: boolean;
  stock: number;
  isSensitive: boolean;
  material: string;
  design: string;
  ageRange: {
    min: number;
    max: number;
    unit: "years" | "months";
  };
  safetyFeatures: string[];
  qualityAssurance: {
    isCertified: boolean;
    certification?: string;
    warrantyPeriod?: number;
    warrantyDetails?: string;
  };
}
