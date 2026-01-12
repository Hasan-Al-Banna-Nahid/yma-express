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
import { PromoService } from "../../modules/promos/promos.service";
import mongoose from "mongoose";
import Cart from "../../modules/Cart/cart.model";
import Product from "../../modules/Product/product.model";

// ==================== CREATE ORDER ====================
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user._id;

  const {
    shippingAddress,
    paymentMethod = "cash_on_delivery",
    termsAccepted,
    invoiceType = "regular",
    bankDetails,
    promoCode,
  } = req.body;

  // Validate required fields
  if (!shippingAddress) {
    throw new ApiError("Shipping address is required", 400);
  }

  // Create order
  const order = await createOrderFromCart(userId, {
    shippingAddress,
    paymentMethod,
    termsAccepted,
    invoiceType,
    bankDetails,
    promoCode,
  });

  // Return response
  res.status(201).json({
    success: true,
    message: "Order placed successfully",
    data: {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        subtotalAmount: order.subtotalAmount,
        deliveryFee: order.deliveryFee,
        overnightFee: order.overnightFee,
        discountAmount: order.discountAmount,
        totalAmount: order.totalAmount,
        promoCode: order.promoCode,
        promoDiscount: order.promoDiscount,
        status: order.status,
        paymentMethod: order.paymentMethod,
        invoiceType: order.invoiceType,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
        createdAt: order.createdAt,
        itemsCount: order.items.length,
        shippingAddress: {
          firstName: order.shippingAddress.firstName,
          lastName: order.shippingAddress.lastName,
          phone: order.shippingAddress.phone,
          email: order.shippingAddress.email,
          street: order.shippingAddress.street,
          apartment: order.shippingAddress.apartment,
          city: order.shippingAddress.city,
          zipCode: order.shippingAddress.zipCode,
          companyName: order.shippingAddress.companyName,
          deliveryTime: order.shippingAddress.deliveryTime,
          collectionTime: order.shippingAddress.collectionTime,
          keepOvernight: order.shippingAddress.keepOvernight,
          hireOccasion: order.shippingAddress.hireOccasion,
        },
      },
    },
  });
});

// ==================== CHECK STOCK ====================
export const checkStock = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user._id;

  const stockCheck = await checkCartStock(userId);

  res.status(200).json({
    success: true,
    data: stockCheck,
  });
});

// ==================== CHECK DATE AVAILABILITY ====================
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

    if (start < new Date()) {
      throw new ApiError("Start date cannot be in the past", 400);
    }

    const availability = await checkDateAvailabilityService(
      new mongoose.Types.ObjectId(productId),
      start,
      end,
      quantity
    );

    res.status(200).json({
      success: true,
      data: availability,
    });
  }
);

// ==================== GET AVAILABLE DATES ====================
export const getAvailableDates = asyncHandler(
  async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { startDate, endDate, quantity = 1 } = req.query;

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        throw new ApiError("Invalid start date", 400);
      }
    }

    if (endDate) {
      end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        throw new ApiError("Invalid end date", 400);
      }
    }

    // Validate date range
    if (start && end && start > end) {
      throw new ApiError("Start date cannot be after end date", 400);
    }

    const availableDates = await getAvailableDatesService(
      new mongoose.Types.ObjectId(productId),
      start,
      end,
      Number(quantity)
    );

    res.status(200).json({
      success: true,
      data: availableDates,
    });
  }
);

// ==================== PROMO CODE VALIDATION ====================
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

    try {
      // Get promo by name
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
      const validation = await promoService.validatePromo(
        promoCode,
        orderAmount
      );

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
    } catch (error: any) {
      return res.status(200).json({
        success: false,
        valid: false,
        message: error.message || "Invalid promo code",
        discount: 0,
      });
    }
  }
);

// ==================== GET ACTIVE PROMOS ====================
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

// ==================== APPLY PROMO TO CART ====================
export const applyPromoToCart = asyncHandler(
  async (req: Request, res: Response) => {
    const { promoCode } = req.body;
    const userId = (req as AuthenticatedRequest).user._id;

    if (!promoCode) {
      throw new ApiError("Promo code is required", 400);
    }

    const promoService = new PromoService();

    try {
      // Get cart to calculate order amount
      const cart = await Cart.findOne({ user: userId }).populate(
        "items.product"
      );
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
    } catch (error: any) {
      return res.status(200).json({
        success: false,
        valid: false,
        message: error.message || "Invalid promo code",
        discount: 0,
      });
    }
  }
);
