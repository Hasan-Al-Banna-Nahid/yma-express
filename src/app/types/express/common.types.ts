// src/types/common.types.ts
import { Types, Document } from "mongoose";

export interface Timestamps {
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ApiResponse<T = any> {
  status: "success" | "error";
  message?: string;
  data?: T;
  results?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}
// types/common.types.ts
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "payment_pending"
  | "payment_completed"
  | "processing"
  | "ready_for_delivery"
  | "out_for_delivery"
  | "delivered"
  | "ready_for_collection"
  | "collected"
  | "completed"
  | "cancelled"
  | "refunded";

export type PaymentMethod =
  | "cash_on_delivery"
  | "bank_transfer"
  | "card"
  | "paypal";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type InvoiceType = "regular" | "corporate";
export type RentalType = "daily" | "weekly" | "monthly";
export type InventoryStatus = "available" | "booked" | "maintenance";
