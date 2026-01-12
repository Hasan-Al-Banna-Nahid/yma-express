import mongoose, { Types } from "mongoose";

export interface IInventory {
  product: Types.ObjectId;
  productName: string;
  description: string;
  dimensions: {
    width: number;
    length: number;
    height: number;
    unit?: string;
  };
  images: string[];
  isSensitive: boolean;
  deliveryTime: string;
  collectionTime: string;
  rentalPrice: number;
  quantity: number;
  category: string;
  warehouse: string;
  vendor: string;
  status: "available" | "booked" | "maintenance" | "out_of_stock";
  date?: Date;
  bookings?: Types.ObjectId[];
  minBookingDays?: number;
  maxBookingDays?: number;
  bookedDates?: {
    startDate: Date;
    endDate: Date;
    bookingId: Types.ObjectId;
  }[];
}

export interface InventoryCheckData {
  productId: string;
  startDate: Date;
  endDate: Date;
  quantity: number;
}

export interface InventoryAvailability {
  isAvailable: boolean;
  availableQuantity: number;
  inventoryItems?: IInventory[];
  message?: string;
}
