// src/interfaces/cart.interface.ts
import mongoose from "mongoose";

export interface ICartItem {
  rentalType?: string;
  productType: string;
  product: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  startDate?: Date;
  endDate?: Date;
  name?: string;
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
    startDate?: Date;
    endDate?: Date;
    rentalType?: string;
  }>;
}

export interface IUpdateCartItemRequest {
  quantity: number;
  startDate?: Date;
  endDate?: Date;
  rentalType?: string;
}
export interface CartItem {
  productId: string;
  quantity: number;
  startDate?: Date;
  endDate?: Date;
  rentalType?: string;
}

export interface CartValidationResult {
  valid: boolean;
  items: Array<{
    productId: string;
    product: any;
    quantity: number;
    price: number;
    subtotal: number;
    inStock: boolean;
    availableStock: number;
    startDate?: Date;
    endDate?: Date;
    rentalType?: string;
  }>;
  totalPrice: number;
  totalItems: number;
  errors?: Array<{
    productId: string;
    message: string;
  }>;
}
