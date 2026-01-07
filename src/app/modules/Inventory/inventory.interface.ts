import mongoose from "mongoose";

export interface IInventory {
  product: mongoose.Schema.Types.ObjectId;
  warehouse: string;
  vendor: string;
  quantity: number;
  date?: Date;
  status?: "available" | "booked" | "maintenance";
  bookings?: mongoose.Schema.Types.ObjectId[];
  rentalFee: number;
}
