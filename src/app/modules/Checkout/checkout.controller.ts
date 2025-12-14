import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as checkoutService from "./checkout.service";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import ApiError from "../../utils/apiError";
import { createOrderFromCart } from "./checkout.service";

// checkout.controller.ts
export const createOrder = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).user._id;

  const {
    shippingAddress,
    paymentMethod,
    termsAccepted,
    invoiceType,
    bankDetails,
  } = req.body;

  if (!shippingAddress) {
    throw new ApiError("Shipping address is required", 400);
  }

  if (!termsAccepted) {
    throw new ApiError("You must accept terms & conditions", 400);
  }

  const order = await createOrderFromCart(userId, {
    shippingAddress,
    paymentMethod,
    termsAccepted,
    invoiceType,
    bankDetails,
  });

  res.status(201).json({
    success: true,
    message: "Order placed successfully",
    order,
  });
});
