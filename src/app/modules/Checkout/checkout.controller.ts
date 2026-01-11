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
import { PromoService } from "../../modules/promos/promos.service"; // Add this import

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user._id;

  const {
    shippingAddress,
    paymentMethod = "cash_on_delivery",
    termsAccepted,
    invoiceType = "regular",
    bankDetails,
    promoCode, // Add promoCode to destructuring
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

  // Validate promo code if provided
  if (promoCode) {
    const promoService = new PromoService();
    const promo = await promoService.getPromoByName(promoCode);
    if (!promo) {
      throw new ApiError("Invalid promo code", 400);
    }
  }

  // Create order with promoCode
  const order = await createOrderFromCart(userId, {
    shippingAddress,
    paymentMethod,
    termsAccepted,
    invoiceType,
    bankDetails,
    promoCode, // Pass promoCode
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
        discountAmount: order.discountAmount, // Add discount amount
        promoCode: order.promoCode, // Add promo code
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

export const checkStock = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user._id;

  const stockCheck = await checkCartStock(userId);

  res.status(200).json({
    success: true,
    data: stockCheck,
  });
});

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

// ============ PROMO CODE ENDPOINTS ============

// Validate promo code for checkout
export const validatePromoCode = asyncHandler(
  async (req: Request, res: Response) => {
    const { promoCode, orderAmount } = req.body;
    const userId = (req as AuthenticatedRequest).user._id;

    if (!promoCode) {
      throw new ApiError("Promo code is required", 400);
    }

    if (!orderAmount || orderAmount <= 0) {
      throw new ApiError("Valid order amount is required", 400);
    }

    const promoService = new PromoService();

    // First find promo by name
    const promo = await promoService.getPromoByName(promoCode);

    if (!promo) {
      return res.status(200).json({
        success: false,
        valid: false,
        message: "Invalid promo code",
        discount: 0,
      });
    }

    // Validate promo
    const validation = await promoService.validatePromo(promoCode, orderAmount);

    if (!validation.valid) {
      return res.status(200).json({
        success: false,
        valid: false,
        message: validation.message,
        discount: 0,
      });
    }

    // Calculate discount
    let discount = 0;
    if (promo.discountType === "percentage") {
      discount = (orderAmount * promo.discountPercentage) / 100;
      if (promo.maxDiscountValue && discount > promo.maxDiscountValue) {
        discount = promo.maxDiscountValue;
      }
    } else if (promo.discountType === "fixed_amount") {
      discount = promo.discount;
    } else if (promo.discountType === "free_shipping") {
      discount = promo.discount;
    }

    res.status(200).json({
      success: true,
      valid: true,
      message: "Promo code is valid",
      data: {
        promoName: promo.promoName,
        discount,
        discountType: promo.discountType,
        discountPercentage: promo.discountPercentage,
        maxDiscountValue: promo.maxDiscountValue,
        minimumOrderValue: promo.minimumOrderValue,
        finalAmount: orderAmount - discount,
      },
    });
  }
);

// Get all active promos for checkout
export const getActivePromos = asyncHandler(
  async (req: Request, res: Response) => {
    const promoService = new PromoService();
    const promos = await promoService.getActivePromos();

    const simplifiedPromos = promos.map((promo) => ({
      promoName: promo.promoName,
      discountPercentage: promo.discountPercentage,
      discountType: promo.discountType,
      discount: promo.discount,
      maxDiscountValue: promo.maxDiscountValue,
      minimumOrderValue: promo.minimumOrderValue,
      validityPeriod: promo.validityPeriod,
      totalUsageLimit: promo.totalUsageLimit,
      usage: promo.usage,
      totalUsage: promo.totalUsage,
      availability: promo.availability,
      status: promo.status,
    }));

    res.status(200).json({
      success: true,
      count: promos.length,
      data: simplifiedPromos,
    });
  }
);

// Apply promo code to cart (pre-checkout)
export const applyPromoToCart = asyncHandler(
  async (req: Request, res: Response) => {
    const { promoCode } = req.body;
    const userId = (req as AuthenticatedRequest).user._id;

    if (!promoCode) {
      throw new ApiError("Promo code is required", 400);
    }

    // Get cart to calculate order amount
    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || cart.items.length === 0) {
      throw new ApiError("Cart is empty", 400);
    }

    // Calculate cart total
    let cartTotal = 0;
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (product) {
        cartTotal += item.quantity * item.price;
      }
    }

    const promoService = new PromoService();

    // Find promo by name
    const promo = await promoService.getPromoByName(promoCode);

    if (!promo) {
      return res.status(200).json({
        success: false,
        valid: false,
        message: "Invalid promo code",
        discount: 0,
      });
    }

    // Validate promo
    const validation = await promoService.validatePromo(promoCode, cartTotal);

    if (!validation.valid) {
      return res.status(200).json({
        success: false,
        valid: false,
        message: validation.message,
        discount: 0,
      });
    }

    // Calculate discount
    let discount = 0;
    if (promo.discountType === "percentage") {
      discount = (cartTotal * promo.discountPercentage) / 100;
      if (promo.maxDiscountValue && discount > promo.maxDiscountValue) {
        discount = promo.maxDiscountValue;
      }
    } else if (promo.discountType === "fixed_amount") {
      discount = promo.discount;
    } else if (promo.discountType === "free_shipping") {
      discount = promo.discount;
    }

    res.status(200).json({
      success: true,
      valid: true,
      message: "Promo code applied to cart",
      data: {
        promoName: promo.promoName,
        discount,
        cartTotal,
        finalAmount: cartTotal - discount,
        discountType: promo.discountType,
        discountPercentage: promo.discountPercentage,
        maxDiscountValue: promo.maxDiscountValue,
        minimumOrderValue: promo.minimumOrderValue,
      },
    });
  }
);
