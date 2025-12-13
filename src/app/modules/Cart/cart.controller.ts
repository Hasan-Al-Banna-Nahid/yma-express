import { Request, Response, NextFunction } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as cartService from "./cart.service";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import ApiError from "../../utils/apiError";

export const getCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as AuthenticatedRequest).user._id.toString();

    console.log("📋 [CART CONTROLLER] Getting cart for user:", userId);

    // Get cart with populated products
    const cart = await cartService.getCartByUserId(userId);

    res.status(200).json({
      status: "success",
      data: {
        cart,
      },
    });
  }
);

export const addToCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as AuthenticatedRequest).user._id.toString();
    const { items, productId, quantity, startDate, endDate } = req.body;

    console.log("🛒 [CART CONTROLLER] Add to cart request:", {
      userId,
      hasItemsArray: Array.isArray(items),
      itemsCount: Array.isArray(items) ? items.length : 0,
      singleItem: productId ? { productId, quantity } : null,
    });

    let cart;

    // Validate input
    if (Array.isArray(items)) {
      // Validate items array
      if (items.length === 0) {
        throw new ApiError("Items array cannot be empty", 400);
      }

      // Validate each item in the array
      for (const item of items) {
        if (!item.productId || !item.quantity) {
          throw new ApiError("Each item must have productId and quantity", 400);
        }
        if (item.quantity <= 0) {
          throw new ApiError("Quantity must be greater than 0", 400);
        }
      }

      // Multiple items
      cart = await cartService.addMultipleItemsToCart(userId, items);
    } else if (productId && quantity) {
      // Single item (backward compatibility)
      if (quantity <= 0) {
        throw new ApiError("Quantity must be greater than 0", 400);
      }

      cart = await cartService.addItemToCart(
        userId,
        productId,
        quantity,
        startDate,
        endDate
      );
    } else {
      throw new ApiError(
        "Either provide 'items' array or 'productId' with 'quantity'",
        400
      );
    }

    res.status(200).json({
      status: "success",
      message: Array.isArray(items)
        ? "Items added to cart successfully"
        : "Item added to cart successfully",
      data: {
        cart,
      },
    });
  }
);

export const updateCartItems = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as AuthenticatedRequest).user._id.toString();
    const { items, productId, quantity, startDate, endDate } = req.body;

    console.log("🔄 [CART CONTROLLER] Update cart request:", {
      userId,
      hasItemsArray: Array.isArray(items),
      itemsCount: Array.isArray(items) ? items.length : 0,
      singleItem: productId ? { productId, quantity } : null,
    });

    let cart;

    if (Array.isArray(items)) {
      // Multiple items update
      console.log("📦 [CART CONTROLLER] Processing multiple items update");

      // Validate items array
      if (items.length === 0) {
        throw new ApiError("Items array cannot be empty", 400);
      }

      // Validate each item in the array
      for (const item of items) {
        if (!item.productId || item.quantity === undefined) {
          throw new ApiError("Each item must have productId and quantity", 400);
        }
        if (item.quantity < 0) {
          throw new ApiError("Quantity cannot be negative", 400);
        }
      }

      cart = await cartService.updateCartItems(userId, { items });
    } else if (productId && quantity !== undefined) {
      // Single item update (backward compatibility)
      console.log(
        "🛒 [CART CONTROLLER] Processing single item update for product:",
        productId
      );

      if (quantity < 0) {
        throw new ApiError("Quantity cannot be negative", 400);
      }

      cart = await cartService.updateCartItems(userId, {
        productId,
        quantity,
        startDate,
        endDate,
      });
    } else {
      // Invalid request
      throw new ApiError(
        "Either provide 'items' array or 'productId' with 'quantity'",
        400
      );
    }

    console.log("✅ [CART CONTROLLER] Cart update completed successfully");

    res.status(200).json({
      status: "success",
      message: "Cart updated successfully",
      data: {
        cart,
      },
    });
  }
);

export const removeFromCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as AuthenticatedRequest).user._id.toString();
    const { productId } = req.params;

    console.log("🗑️ [CART CONTROLLER] Removing item:", { userId, productId });

    if (!productId || productId.trim() === "") {
      throw new ApiError("Product ID is required", 400);
    }

    const cart = await cartService.removeItemFromCart(userId, productId);

    res.status(200).json({
      status: "success",
      message: "Item removed from cart successfully",
      data: {
        cart,
      },
    });
  }
);

export const clearCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as AuthenticatedRequest).user._id.toString();

    console.log("🧹 [CART CONTROLLER] Clearing cart for user:", userId);

    const cart = await cartService.clearCart(userId);

    res.status(200).json({
      status: "success",
      message: "Cart cleared successfully",
      data: {
        cart,
      },
    });
  }
);

export const getCartSummary = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as AuthenticatedRequest).user._id.toString();

    console.log("📊 [CART CONTROLLER] Getting cart summary for user:", userId);

    const summary = await cartService.getCartSummary(userId);

    res.status(200).json({
      status: "success",
      data: {
        summary,
      },
    });
  }
);
