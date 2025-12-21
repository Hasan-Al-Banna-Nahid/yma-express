// src/interfaces/cart.interface.ts
import mongoose from "mongoose";

export interface ICartItem {
  rentalType?: string; // ✅ Make it optional and correct type
  productType: string;
  product: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  startDate?: Date;
  endDate?: Date;
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
    rentalType?: string; // Add this
  }>;
}

export interface IUpdateCartItemRequest {
  quantity: number;
  startDate?: string;
  endDate?: string;
  rentalType?: string; // Add this
}
