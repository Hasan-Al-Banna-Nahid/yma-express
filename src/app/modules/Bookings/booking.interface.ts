// src/interfaces/booking.interface.ts
import mongoose from "mongoose";
import { IUser } from "./user.interface";
import { IAddress } from "./address.interface";

// Allow `user` to be either an ObjectId or a populated IUser doc
export interface IBooking {
  product: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId | (IUser & { _id: mongoose.Types.ObjectId });
  price: number;
  paid?: boolean;
  status?: "pending" | "confirmed" | "cancelled" | "completed";
  startDate: Date;
  endDate: Date;

  // OLD: deliveryAddress: string; deliveryTime: string;  // (you can keep these if still needed)
  deliveryTime: string;

  // NEW
  shippingAddress?: IAddress;
  billingAddress?: IAddress;
  specialRequests?: string;
}
