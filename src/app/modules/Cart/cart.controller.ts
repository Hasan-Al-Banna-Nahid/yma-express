import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as cartService from "./cart.service";

/**
 * Cart identification strategy
 * - Client sends `x-cart-id`
 * - If missing → new cart auto-created
 */
const getCartId = (req: Request): string | undefined => {
  const cartId = req.headers["x-cart-id"];
  return typeof cartId === "string" ? cartId : undefined;
};

/**
 * GET /api/cart
 */
export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cartId = getCartId(req);

  const cart = await cartService.getCartByUserId(cartId);

  // Send cartId back so frontend can persist it
  res.setHeader("x-cart-id", cart.cartId);

  res.status(200).json({
    status: "success",
    data: { cart },
  });
});

/**
 * POST /api/cart
 * Supports:
 * - single item
 * - multiple items
 */
export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  const cartId = getCartId(req);
  const { items, productId, quantity, startDate, endDate, rentalType } =
    req.body;

  let cart;

  if (Array.isArray(items)) {
    cart = await cartService.addMultipleItemsToCart(cartId, items);
  } else {
    cart = await cartService.addItemToCart(
      cartId,
      productId,
      quantity,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      rentalType,
    );
  }

  res.setHeader("x-cart-id", cart.cartId);

  res.status(200).json({
    status: "success",
    message: "Item(s) added to cart",
    data: { cart },
  });
});

/**
 * PUT /api/cart
 */
export const updateCartItems = asyncHandler(
  async (req: Request, res: Response) => {
    const cartId = getCartId(req);

    const cart = await cartService.updateCartItems(cartId, req.body);

    res.setHeader("x-cart-id", cart.cartId);

    res.status(200).json({
      status: "success",
      message: "Cart updated successfully",
      data: { cart },
    });
  },
);

/**
 * DELETE /api/cart/:productId
 */
export const removeFromCart = asyncHandler(
  async (req: Request, res: Response) => {
    const cartId = getCartId(req);
    const { productId } = req.params;

    const cart = await cartService.removeItemFromCart(cartId, productId);

    res.setHeader("x-cart-id", cart.cartId);

    res.status(200).json({
      status: "success",
      message: "Item removed from cart",
      data: { cart },
    });
  },
);

/**
 * DELETE /api/cart
 */
export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const cartId = getCartId(req);

  const cart = await cartService.clearCart(cartId);

  res.setHeader("x-cart-id", cart.cartId);

  res.status(200).json({
    status: "success",
    message: "Cart cleared successfully",
    data: { cart },
  });
});

/**
 * GET /api/cart/summary
 */
export const getCartSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const cartId = getCartId(req);

    const summary = await cartService.getCartSummary(cartId);

    res.status(200).json({
      status: "success",
      data: { summary },
    });
  },
);
