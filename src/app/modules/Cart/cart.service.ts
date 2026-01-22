import ApiError from "../../utils/apiError";
import { cartStore, createCart, MemoryCart } from "./cart.store";
import Product from "../Product/product.model"; // Import Product model

/** 🔒 ALWAYS returns a cart */
const resolveCart = (cartId?: string): MemoryCart => {
  if (!cartId) return createCart();

  const existing = cartStore.get(cartId);
  if (!existing) return createCart();

  return existing;
};

const recalc = (cart: MemoryCart) => {
  cart.totalItems = cart.items.reduce((s, i) => s + i.quantity, 0);
  cart.totalPrice = cart.items.reduce((s, i) => s + i.quantity * i.price, 0);
  cart.updatedAt = new Date();
};

/** GET */
export const getCartByUserId = async (cartId?: string): Promise<MemoryCart> => {
  return resolveCart(cartId);
};

/** ADD SINGLE */
export const addItemToCart = async (
  cartId: string | undefined,
  productId: string,
  quantity: number,
  startDate?: Date,
  endDate?: Date,
  rentalType?: string,
): Promise<MemoryCart> => {
  const cart = resolveCart(cartId);

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(`Product with ID ${productId} not found`, 404);
  }

  const item = cart.items.find((i) => i.productId === productId);
  if (item) {
    item.quantity += quantity;
  } else {
    cart.items.push({
      productId,
      quantity,
      price: product.price, // Use actual product price
      startDate,
      endDate,
      rentalType,
    });
  }

  recalc(cart);
  return cart;
};

/** ADD MULTIPLE */
export const addMultipleItemsToCart = async (
  cartId: string | undefined,
  items: {
    productId: string;
    quantity: number;
    startDate?: Date;
    endDate?: Date;
    rentalType?: string;
  }[],
): Promise<MemoryCart> => {
  const cart = resolveCart(cartId);

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      throw new ApiError(`Product with ID ${item.productId} not found`, 404);
    }

    const existing = cart.items.find((i) => i.productId === item.productId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      cart.items.push({
        ...item,
        price: product.price, // Use actual product price
      });
    }
  }

  recalc(cart);
  return cart;
};

/** UPDATE */
export const updateCartItems = async (
  cartId: string | undefined,
  updateData: any,
): Promise<MemoryCart> => {
  const cart = resolveCart(cartId);

  if (Array.isArray(updateData.items)) {
    for (const u of updateData.items) {
      const item = cart.items.find((i) => i.productId === u.productId);
      if (!item) continue;

      if (u.quantity === 0) {
        cart.items = cart.items.filter((i) => i.productId !== u.productId);
      } else {
        Object.assign(item, u);
      }
    }
  }

  recalc(cart);
  return cart;
};

/** REMOVE */
export const removeItemFromCart = async (
  cartId: string | undefined,
  productId: string,
): Promise<MemoryCart> => {
  const cart = resolveCart(cartId);
  cart.items = cart.items.filter((i) => i.productId !== productId);
  recalc(cart);
  return cart;
};

/** CLEAR */
export const clearCart = async (
  cartId: string | undefined,
): Promise<MemoryCart> => {
  const cart = resolveCart(cartId);
  cart.items = [];
  recalc(cart);
  return cart;
};

/** SUMMARY */
export const getCartSummary = async (cartId?: string) => {
  const cart = resolveCart(cartId);
  return {
    totalItems: cart.totalItems,
    totalPrice: cart.totalPrice,
    items: cart.items.map((i) => ({
      ...i,
      subtotal: i.quantity * i.price,
    })),
  };
};
