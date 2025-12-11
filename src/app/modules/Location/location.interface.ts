// src/interfaces/location.interface.ts
import mongoose from "mongoose";

export interface ILocation {
  name: string;
  type: "country" | "state" | "city" | "landmark";
  parent: mongoose.Types.ObjectId | null;
  country: string;
  state: string;
  city: string;
  fullAddress: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
