import mongoose, { Types } from "mongoose";

export interface IInventory {
  product: Types.ObjectId;
  warehouse: string;
  vendor: string;
  quantity: number;
  date?: Date;
  status?: "available" | "booked" | "maintenance" | "out_of_stock";
  bookings?: Types.ObjectId[];
  rentalFee: number;
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
