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
  duration: string;
  maxGroupSize: number;
  difficulty: "easy" | "medium" | "difficult";
  categories: Types.ObjectId[];
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
    warrantyPeriod?: string;
    warrantyDetails?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
  isTopPick?: boolean;
  topPickRank?: number;
  topPickUpdatedAt?: Date;
  purchaseHistory?: PurchaseHistoryItem[];
  frequentlyBoughtTogether?: FrequentlyBoughtItem[];
  similarProducts?: SimilarProductItem[];
  quantity?: number; // For cart purposes
  vendor?: string;
  deliveryTimeOptions?: string[]; // Array of available delivery times
  collectionTimeOptions?: string[]; // Array of available collection times
  defaultDeliveryTime?: string; // Default delivery time
  defaultCollectionTime?: string; // Default collection time
  deliveryTimeFee?: number; // Default delivery time fee
  collectionTimeFee?: number; // Default collection time fee
  discount?: number; // Added discount field
  bookedDates?: Array<{
    // Added bookedDates array
    startDate: Date;
    endDate: Date;
    bookingId?: Types.ObjectId;
    status?: "confirmed" | "pending" | "cancelled";
  }>;
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
  duration: string;
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
    warrantyPeriod?: string;
    warrantyDetails?: string;
  };
  deliveryTimeOptions?: string[];
  collectionTimeOptions?: string[];
  defaultDeliveryTime?: string;
  defaultCollectionTime?: string;
  deliveryTimeFee?: number;
  collectionTimeFee?: number;
}
// Add to your existing interfaces
export interface PurchaseHistoryItem {
  productId: Types.ObjectId;
  count: number;
  lastPurchased: Date;
}

export interface FrequentlyBoughtItem {
  productId: Types.ObjectId;
  frequency: number;
  confidence: number;
}

export interface SimilarProductItem {
  productId: Types.ObjectId;
  similarityScore: number;
  basedOn: string[];
}
