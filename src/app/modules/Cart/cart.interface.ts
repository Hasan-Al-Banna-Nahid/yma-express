// src/interfaces/cart.interface.ts
import mongoose from "mongoose";

export interface ICartItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  startDate?: Date; // New field
  endDate?: Date; // New field
}

export interface ICart {
  user: mongoose.Types.ObjectId;
  items: ICartItem[];
  totalPrice: number;
  totalItems: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Update request interfaces
export interface IAddToCartRequest {
  items: Array<{
    productId: string;
    quantity: number;
    startDate?: string; // ISO string
    endDate?: string; // ISO string
  }>;
}

export interface IUpdateCartItemRequest {
  quantity: number;
  startDate?: string;
  endDate?: string;
}
