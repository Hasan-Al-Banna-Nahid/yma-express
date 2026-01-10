import mongoose from "mongoose";

export interface ICoordinates {
  lat: number;
  lng: number;
}

export interface ILocation {
  name: string;
  type: "country" | "region" | "city" | "area" | "postcode";
  parent: mongoose.Types.ObjectId | null;

  // Location details (all optional for flexibility)
  country?: string;
  state?: string; // Like "East London"
  city?: string;
  area?: string; // Like "Becontree"
  postcode?: string; // Like "RM9", "RM10"

  // Delivery information
  deliveryOptions: {
    isAvailable: boolean;
    isFree: boolean;
    fee: number;
    minOrder: number;
    radius: number; // in meters
    estimatedTime: number; // in minutes
  };

  // Additional fields
  description?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}
