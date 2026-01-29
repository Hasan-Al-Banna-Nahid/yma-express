import { Document, Types } from "mongoose";

export interface IDeliveryArea {
  _id?: Types.ObjectId;
  name: string;
  postcode: string;
  deliveryFee: number;
  isFree: boolean;
  minOrder: number;
  estimatedTime: number;
  isActive: boolean;
}

export interface IDeliveryOptions {
  isAvailable: boolean;
  isFree: boolean;
  fee: number;
  minOrder: number;
  estimatedTime: number;
  radius: number; // in meters
}

export interface ILocation extends Document {
  name: string;
  type: "country" | "state" | "city" | "area" | "postcode";
  parent: Types.ObjectId | null;
  children?: Types.ObjectId[];

  country?: string;
  state?: string;
  city?: string;
  area?: string;
  postcode?: string;
  deliveryAreas: IDeliveryArea[];
  deliveryOptions?: IDeliveryOptions; // Delivery options for this location
  description?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

// Service inputs
export interface ICreateLocationData {
  name: string;
  type: "country" | "state" | "city" | "area" | "postcode";
  parent?: string | null;
  country?: string;
  state?: string;
  city?: string;
  area?: string;
  postcode?: string;
  deliveryAreas?: IDeliveryArea[];
  deliveryOptions?: IDeliveryOptions;
  description?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface IUpdateLocationData extends Partial<ICreateLocationData> {}

export interface ICreateDeliveryAreaData {
  name: string;
  postcode: string;
  deliveryFee: number;
  isFree?: boolean;
  minOrder: number;
  estimatedTime: number;
  isActive?: boolean;
}

export interface IUpdateDeliveryAreaData extends Partial<ICreateDeliveryAreaData> {}

export interface ILocationFilters {
  search?: string;
  type?: "country" | "state" | "city" | "area" | "postcode";
  country?: string;
  state?: string;
  city?: string;
  area?: string;
  postcode?: string;
  parent?: string | null;
  hasDeliveryAreas?: "true" | "false";
  isActive?: "true" | "false";
}

export interface IDeliveryCheckResult {
  available: boolean;
  location?: {
    name: string;
    type: "country" | "state" | "city" | "area" | "postcode";
    state?: string;
    city?: string;
  };
  deliveryArea?: IDeliveryArea;
  deliveryOptions?: IDeliveryOptions;
  meetsMinOrder?: boolean;
  message: string;
}
