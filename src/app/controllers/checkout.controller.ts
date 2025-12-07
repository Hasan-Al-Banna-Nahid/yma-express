import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import * as checkoutService from "../services/checkout.service";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import ApiError from "../utils/apiError";

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user._id.toString();

  console.log("🛒 [CHECKOUT] Creating order for user:", userId);

  const {
    shippingAddress,
    paymentMethod = "cash_on_delivery",
    termsAccepted,
    invoiceType = "regular",
    bankDetails,
  } = req.body;

  // Validate required fields
  if (!shippingAddress) {
    throw new ApiError("Shipping address is required", 400);
  }

  if (termsAccepted === undefined) {
    throw new ApiError("You must accept the terms and conditions", 400);
  }

  if (!termsAccepted) {
    throw new ApiError("You must accept the terms and conditions", 400);
  }

  const order = await checkoutService.createOrderFromCart(userId, {
    shippingAddress,
    paymentMethod,
    termsAccepted,
    invoiceType,
    bankDetails,
  });

  res.status(201).json({
    status: "success",
    message: "Order created successfully",
    data: {
      order,
    },
  });
});
