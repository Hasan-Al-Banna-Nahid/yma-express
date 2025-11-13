import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/asyncHandler";
import * as cartService from "../services/cart.service";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

export const getCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as AuthenticatedRequest).user._id.toString();

    console.log("📋 [CONTROLLER] Getting cart for user:", userId);

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

    console.log("🛒 [CONTROLLER] Add to cart request:", {
      userId,
      hasItemsArray: Array.isArray(items),
      itemsCount: Array.isArray(items) ? items.length : 0,
      singleItem: productId ? { productId, quantity } : null,
    });

    let cart;
    if (Array.isArray(items)) {
      // Multiple items
      cart = await cartService.addMultipleItemsToCart(userId, items);
    } else {
      // Single item (backward compatibility)
      cart = await cartService.addItemToCart(
        userId,
        productId,
        quantity,
        startDate,
        endDate
      );
    }

    res.status(200).json({
      status: "success",
      message: "Items added to cart successfully",
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

    console.log("🔄 [CONTROLLER] Update cart request:", {
      userId,
      hasItemsArray: Array.isArray(items),
      itemsCount: Array.isArray(items) ? items.length : 0,
      singleItem: productId ? { productId, quantity } : null,
    });

    let cart;

    if (Array.isArray(items)) {
      // Multiple items update
      console.log("📦 [CONTROLLER] Processing multiple items update");
      cart = await cartService.updateCartItems(userId, { items });
    } else if (productId && quantity !== undefined) {
      // Single item update (backward compatibility)
      console.log(
        "🛒 [CONTROLLER] Processing single item update for product:",
        productId
      );
      cart = await cartService.updateCartItems(userId, {
        productId,
        quantity,
        startDate,
        endDate,
      });
    } else {
      // Invalid request
      return res.status(400).json({
        status: "error",
        message: "Either provide 'items' array or 'productId' with 'quantity'",
      });
    }

    console.log("✅ [CONTROLLER] Cart update completed successfully");

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

    console.log("🗑️ [CONTROLLER] Removing item:", { userId, productId });

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

    console.log("🧹 [CONTROLLER] Clearing cart for user:", userId);

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
