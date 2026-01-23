import { v4 as uuid } from "uuid";
import ApiError from "../../utils/apiError";
import Product from "../Product/product.model"; // still using DB for product validation

// ──────────────────────────────────────────────
interface CartItem {
  product: string; // product _id as string
  productType: string;
  quantity: number;
  price: number;
  startDate?: Date;
  endDate?: Date;
  rentalType?: string;
}

interface MemoryCart {
  cartId: string;
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

const cartStore = new Map<string, MemoryCart>();

// ──────────────────────────────────────────────
const getOrCreateCart = (cartId: string): MemoryCart => {
  let cart = cartStore.get(cartId);

  if (!cart) {
    cart = {
      cartId,
      items: [],
      totalItems: 0,
      totalPrice: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    cartStore.set(cartId, cart);
  }

  return cart;
};

const recalculateTotals = (cart: MemoryCart) => {
  cart.totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  cart.totalPrice = cart.items.reduce(
    (sum, i) => sum + i.quantity * i.price,
    0,
  );
  cart.updatedAt = new Date();
};

const toPopulatedCart = async (cart: MemoryCart) => {
  if (cart.items.length === 0) {
    return {
      ...cart,
      items: [],
    };
  }

  const productIds = cart.items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } })
    .select("name imageCover price stock slug categories productType")
    .lean();

  const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));

  return {
    ...cart,
    items: cart.items.map((item) => {
      const prod = productMap.get(item.product);
      return {
        ...item,
        product: prod || { _id: item.product, name: "Product not found" },
      };
    }),
  };
};

// ──────────────────────────────────────────────
export const getCart = async (cartId: string) => {
  const cart = getOrCreateCart(cartId);
  return await toPopulatedCart(cart);
};

export const addItem = async (
  cartId: string,
  productId: string,
  quantity: number,
  startDate?: Date,
  endDate?: Date,
  rentalType?: string,
) => {
  const cart = getOrCreateCart(cartId);

  const product = await Product.findById(productId);
  if (!product) throw new ApiError("Product not found", 404);
  if (product.stock < quantity) {
    throw new ApiError(`Insufficient stock. Available: ${product.stock}`, 400);
  }

  const existing = cart.items.find((i) => i.product === productId);

  if (existing) {
    existing.quantity += quantity;
    if (startDate) existing.startDate = startDate;
    if (endDate) existing.endDate = endDate;
    if (rentalType) existing.rentalType = rentalType;
  } else {
    cart.items.push({
      product: productId,
      productType: (product as any).productType || "physical",
      quantity,
      price: product.price,
      startDate,
      endDate,
      rentalType,
    });
  }

  recalculateTotals(cart);
  return await toPopulatedCart(cart);
};

export const addMultipleItems = async (
  cartId: string,
  items: Array<{
    productId: string;
    quantity: number;
    startDate?: Date;
    endDate?: Date;
    rentalType?: string;
  }>,
) => {
  const cart = getOrCreateCart(cartId);

  for (const { productId, quantity, startDate, endDate, rentalType } of items) {
    const product = await Product.findById(productId);
    if (!product) throw new ApiError(`Product ${productId} not found`, 404);
    if (product.stock < quantity) {
      throw new ApiError(`Insufficient stock for ${product.name}`, 400);
    }

    const existing = cart.items.find((i) => i.product === productId);

    if (existing) {
      existing.quantity += quantity;
      if (startDate) existing.startDate = startDate;
      if (endDate) existing.endDate = endDate;
      if (rentalType) existing.rentalType = rentalType;
    } else {
      cart.items.push({
        product: productId,
        productType: (product as any).productType || "physical",
        quantity,
        price: product.price,
        startDate,
        endDate,
        rentalType,
      });
    }
  }

  recalculateTotals(cart);
  return await toPopulatedCart(cart);
};

export const updateItem = async (
  cartId: string,
  productId: string,
  quantity: number,
  startDate?: Date,
  endDate?: Date,
  rentalType?: string,
) => {
  const cart = getOrCreateCart(cartId);

  const idx = cart.items.findIndex((i) => i.product === productId);

  if (idx === -1) {
    // treat as add new if quantity > 0
    if (quantity > 0) {
      return addItem(
        cartId,
        productId,
        quantity,
        startDate,
        endDate,
        rentalType,
      );
    }
    throw new ApiError("Item not found in cart", 404);
  }

  if (quantity === 0) {
    cart.items.splice(idx, 1);
  } else {
    const product = await Product.findById(productId);
    if (!product) throw new ApiError("Product not found", 404);

    const currentQty = cart.items[idx].quantity;
    if (quantity > currentQty) {
      const increase = quantity - currentQty;
      if (product.stock < increase) {
        throw new ApiError(`Not enough stock. Need ${increase} more`, 400);
      }
    }

    cart.items[idx].quantity = quantity;
    if (startDate) cart.items[idx].startDate = startDate;
    if (endDate) cart.items[idx].endDate = endDate;
    if (rentalType) cart.items[idx].rentalType = rentalType;
  }

  recalculateTotals(cart);
  return await toPopulatedCart(cart);
};

export const updateMultipleItems = async (
  cartId: string,
  items: Array<{
    productId: string;
    quantity: number;
    startDate?: Date;
    endDate?: Date;
    rentalType?: string;
  }>,
) => {
  const cart = getOrCreateCart(cartId);

  for (const { productId, quantity, startDate, endDate, rentalType } of items) {
    const idx = cart.items.findIndex((i) => i.product === productId);

    if (idx === -1) {
      if (quantity > 0) {
        await addItem(
          cartId,
          productId,
          quantity,
          startDate,
          endDate,
          rentalType,
        );
      }
      continue;
    }

    if (quantity === 0) {
      cart.items.splice(idx, 1);
    } else {
      const product = await Product.findById(productId);
      if (!product) throw new ApiError(`Product ${productId} not found`, 404);

      const currentQty = cart.items[idx].quantity;
      if (quantity > currentQty) {
        const increase = quantity - currentQty;
        if (product.stock < increase) {
          throw new ApiError(`Not enough stock for ${product.name}`, 400);
        }
      }

      cart.items[idx].quantity = quantity;
      if (startDate) cart.items[idx].startDate = startDate;
      if (endDate) cart.items[idx].endDate = endDate;
      if (rentalType) cart.items[idx].rentalType = rentalType;
    }
  }

  recalculateTotals(cart);
  return await toPopulatedCart(cart);
};

export const removeItem = async (cartId: string, productId: string) => {
  const cart = getOrCreateCart(cartId);

  const initialLength = cart.items.length;
  cart.items = cart.items.filter((i) => i.product !== productId);

  if (cart.items.length === initialLength) {
    throw new ApiError("Item not found in cart", 404);
  }

  recalculateTotals(cart);
  return await toPopulatedCart(cart);
};

export const clear = async (cartId: string) => {
  const cart = getOrCreateCart(cartId);
  cart.items = [];
  recalculateTotals(cart);
  return await toPopulatedCart(cart);
};

export const getSummary = async (cartId: string) => {
  const cart = getOrCreateCart(cartId);

  const itemsSummary = cart.items.map((item) => ({
    productId: item.product,
    productType: item.productType,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.quantity * item.price,
    startDate: item.startDate,
    endDate: item.endDate,
    rentalType: item.rentalType,
  }));

  return {
    totalItems: cart.totalItems,
    totalPrice: cart.totalPrice,
    items: itemsSummary,
  };
};
