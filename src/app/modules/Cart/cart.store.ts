import { v4 as uuid } from "uuid";

export interface MemoryCartItem {
  productId: string;
  quantity: number;
  price: number;
  startDate?: Date;
  endDate?: Date;
  rentalType?: string;
}

export interface MemoryCart {
  cartId: string;
  items: MemoryCartItem[];
  totalItems: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export const cartStore = new Map<string, MemoryCart>();

export const createCart = (): MemoryCart => {
  const cart: MemoryCart = {
    cartId: uuid(),
    items: [],
    totalItems: 0,
    totalPrice: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  cartStore.set(cart.cartId, cart);
  return cart;
};
