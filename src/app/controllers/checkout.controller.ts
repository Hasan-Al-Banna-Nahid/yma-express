// src/controllers/checkout.controller.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/asyncHandler";
import * as checkoutService from "../services/checkout.service";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import ApiError from "../utils/apiError";

export const createOrder = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as AuthenticatedRequest).user._id.toString();

    console.log("🟡 [CONTROLLER] Checkout request received");
    console.log("👤 User ID from auth:", userId);
    console.log("📦 Request body:", JSON.stringify(req.body, null, 2));

    const {
      shippingAddress,
      paymentMethod = "cash_on_delivery",
      termsAccepted,
      invoiceType = "regular",
      bankDetails,
    } = req.body;

    // Validate required fields
    if (!shippingAddress) {
      console.log("❌ [CONTROLLER] Missing shipping address");
      throw new ApiError("Shipping address is required", 400);
    }

    if (termsAccepted === undefined) {
      console.log("❌ [CONTROLLER] Terms acceptance not specified");
      throw new ApiError("You must accept the terms and conditions", 400);
    }

    if (!termsAccepted) {
      console.log("❌ [CONTROLLER] Terms not accepted");
      throw new ApiError("You must accept the terms and conditions", 400);
    }

    console.log("✅ [CONTROLLER] Validation passed, calling service...");

    const order = await checkoutService.createOrderFromCart(userId, {
      shippingAddress,
      paymentMethod,
      termsAccepted,
      invoiceType,
      bankDetails,
    });

    console.log("✅ [CONTROLLER] Order created successfully");

    res.status(201).json({
      status: "success",
      message: "Order created successfully",
      data: {
        order,
      },
    });
  }
);

export const getOrder = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const orderId = req.params.id;
    console.log("🔍 [CONTROLLER] Fetching order:", orderId);

    const order = await checkoutService.getOrderById(orderId);

    res.status(200).json({
      status: "success",
      data: {
        order,
      },
    });
  }
);

export const getMyOrders = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as AuthenticatedRequest).user._id.toString();
    console.log("📋 [CONTROLLER] Fetching orders for user:", userId);

    const orders = await checkoutService.getUserOrders(userId);

    res.status(200).json({
      status: "success",
      results: orders.length,
      data: {
        orders,
      },
    });
  }
);
