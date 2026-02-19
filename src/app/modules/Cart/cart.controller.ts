import { Request, Response, NextFunction } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as cartService from "./cart.service"; // ← we'll update this too
import ApiError from "../../utils/apiError";
import { v4 as uuid } from "uuid";

// cart.controller.ts
const getCartId = (req: Request, res: Response): string => {
  const headerValue = req.headers["x-cart-id"];

  // Handle different possible types (string | string[] | undefined)
  let cartId: string | undefined;

  if (typeof headerValue === "string") {
    cartId = headerValue.trim();
  } else if (Array.isArray(headerValue) && headerValue.length > 0) {
    cartId = headerValue[0].trim(); // rare case - take first
  }

  if (cartId && cartId.length > 0) {
    console.log(`[CART-ID] Using existing from header: ${cartId}`);
    return cartId;
  }

  // No valid cartId → create new
  const newId = uuid();
  console.warn(
    `[CART-ID] No valid x-cart-id header received → creating new: ${newId}\n` +
      `   Request path: ${req.method} ${req.originalUrl}\n` +
      `   Body had items array?: ${Array.isArray(req.body?.items)}\n` +
      `   Body had single productId?: ${!!req.body?.productId}`,
  );

  res.setHeader("x-cart-id", newId);
  return newId;
};

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cartId = getCartId(req, res);
  console.log("📋 [CART CONTROLLER] Getting cart:", cartId);

  const cart = await cartService.getCart(cartId);

  res.status(200).json({
    status: "success",
    data: { cart },
  });
});

export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  const cartId = getCartId(req, res);
  const { items, productId, quantity, startDate, endDate, rentalType } =
    req.body;

  console.log("🛒 [CART CONTROLLER] Add to cart:", {
    cartId,
    hasItemsArray: Array.isArray(items),
  });

  let cart;

  if (Array.isArray(items)) {
    if (items.length === 0)
      throw new ApiError("Items array cannot be empty", 400);

    const processedItems = items.map((item: any) => {
      if (!item.productId) {
        throw new ApiError("Each item must have productId", 400);
      }

      return {
        ...item,
        quantity: 1,
        startDate: item.startDate ? new Date(item.startDate) : undefined,
        endDate: item.endDate ? new Date(item.endDate) : undefined,
      };
    });

    cart = await cartService.addMultipleItems(cartId, processedItems);
  } else if (productId) {
    cart = await cartService.addItem(
      cartId,
      productId,
      1,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      rentalType,
    );
  } else {
    throw new ApiError(
      "Provide 'items' array OR 'productId' + 'quantity'",
      400,
    );
  }

  res.setHeader("x-cart-id", cartId);

  res.status(200).json({
    status: "success",
    message: Array.isArray(items) ? "Items added" : "Item added",
    data: { cart },
  });
});

export const updateCartItems = asyncHandler(
  async (req: Request, res: Response) => {
    const cartId = getCartId(req, res);
    const { items, productId, quantity, startDate, endDate, rentalType } =
      req.body;

    console.log("🔄 [CART CONTROLLER] Update cart:", { cartId });

    let cart;

    if (Array.isArray(items)) {
      if (items.length === 0)
        throw new ApiError("Items array cannot be empty", 400);

      const processedItems = items.map((item: any) => {
        if (!item.productId) {
          throw new ApiError("Each item must have productId", 400);
        }

        return {
          ...item,
          quantity: 1,
          startDate: item.startDate ? new Date(item.startDate) : undefined,
          endDate: item.endDate ? new Date(item.endDate) : undefined,
        };
      });

      cart = await cartService.updateMultipleItems(cartId, processedItems);
    } else if (productId) {
      cart = await cartService.updateItem(
        cartId,
        productId,
        1,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
        rentalType,
      );
    } else {
      throw new ApiError(
        "Provide 'items' array OR 'productId' + 'quantity'",
        400,
      );
    }

    res.setHeader("x-cart-id", cartId);

    res.status(200).json({
      status: "success",
      message: "Cart updated successfully",
      data: { cart },
    });
  },
);

export const removeFromCart = asyncHandler(
  async (req: Request, res: Response) => {
    const cartId = getCartId(req, res);
    const { productId } = req.params;

    if (!productId?.trim()) throw new ApiError("Product ID is required", 400);

    console.log("🗑️ [CART CONTROLLER] Removing item:", { cartId, productId });

    const cart = await cartService.removeItem(cartId, productId);

    res.setHeader("x-cart-id", cartId);

    res.status(200).json({
      status: "success",
      message: "Item removed",
      data: { cart },
    });
  },
);

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const cartId = getCartId(req, res);
  console.log("🧹 [CART CONTROLLER] Clearing cart:", cartId);

  const cart = await cartService.clear(cartId);

  res.setHeader("x-cart-id", cartId);

  res.status(200).json({
    status: "success",
    message: "Cart cleared",
    data: { cart },
  });
});

export const getCartSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const cartId = getCartId(req, res);
    console.log("📊 [CART CONTROLLER] Getting summary:", cartId);

    const summary = await cartService.getSummary(cartId);

    res.setHeader("x-cart-id", cartId);

    res.status(200).json({
      status: "success",
      data: { summary },
    });
  },
);
