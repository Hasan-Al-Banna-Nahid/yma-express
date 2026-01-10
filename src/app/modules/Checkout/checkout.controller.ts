// src/controllers/checkout.controller.ts
import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import ApiError from "../../utils/apiError";
import {
  checkCartStock,
  createOrderFromCart,
  checkDateAvailability as checkDateAvailabilityService,
  getAvailableDates as getAvailableDatesService,
} from "./checkout.service";
import Product from "../../modules/Product/product.model";
import Cart from "../../modules/Cart/cart.model";
import mongoose from "mongoose";

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user._id;

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

  const requiredFields = [
    "firstName",
    "lastName",
    "phone",
    "email",
    "country",
    "city",
    "street",
    "zipCode",
  ];
  for (const field of requiredFields) {
    if (!shippingAddress[field]?.trim()) {
      const fieldName = field.replace(/([A-Z])/g, " $1").toLowerCase();
      throw new ApiError(`${fieldName} is required`, 400);
    }
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(shippingAddress.email)) {
    throw new ApiError("Invalid email format", 400);
  }

  // Phone validation
  const phoneDigits = shippingAddress.phone.replace(/\D/g, "");
  if (phoneDigits.length < 8) {
    throw new ApiError("Phone number must be at least 8 digits", 400);
  }

  if (!termsAccepted) {
    throw new ApiError("You must accept terms & conditions", 400);
  }

  // Validate bank details for corporate invoices
  if (invoiceType === "corporate" && (!bankDetails || !bankDetails.trim())) {
    throw new ApiError("Bank details are required for corporate invoices", 400);
  }

  // Create order
  const order = await createOrderFromCart(userId, {
    shippingAddress,
    paymentMethod,
    termsAccepted,
    invoiceType,
    bankDetails,
  });

  // Return response
  res.status(201).json({
    success: true,
    message: "Order placed successfully",
    data: {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentMethod: order.paymentMethod,
        invoiceType: order.invoiceType,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
        createdAt: order.createdAt,
        itemsCount: order.items.length,
      },
    },
  });
});

// Update the controller to use the service
export const checkStock = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user._id;

  const stockCheck = await checkCartStock(userId);

  res.status(200).json({
    success: true,
    data: stockCheck,
  });
});
// Add to your existing checkout.controller.ts

// Check date availability for checkout
export const checkDateAvailability = asyncHandler(
  async (req: Request, res: Response) => {
    const { productId, startDate, endDate, quantity = 1 } = req.body;

    if (!productId || !startDate || !endDate) {
      throw new ApiError("productId, startDate, and endDate are required", 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      throw new ApiError("Start date cannot be after end date", 400);
    }

    const availability = await checkDateAvailabilityService(
      new mongoose.Types.ObjectId(productId),
      start,
      end
    );

    res.status(200).json({
      success: true,
      data: availability,
    });
  }
);

// Get available dates for checkout
export const getAvailableDates = asyncHandler(
  async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { startDate, endDate, quantity = 1 } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const availableDates = await getAvailableDatesService(
      new mongoose.Types.ObjectId(productId),
      start as any,
      end as any
    );

    res.status(200).json({
      success: true,
      data: availableDates,
    });
  }
);
