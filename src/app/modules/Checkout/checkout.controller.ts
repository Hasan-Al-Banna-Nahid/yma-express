// src/controllers/checkout.controller.ts
import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import ApiError from "../../utils/apiError";
import { createOrderFromCart } from "./checkout.service";

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
