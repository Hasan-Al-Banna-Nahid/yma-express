import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import ApiError from "../../utils/apiError";
import { ApiResponse } from "../../utils/apiResponse";
import * as orderService from "./order.service";

export const createOrderHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const aReq = req as any;
    const userId = aReq.user.id;
    const orderData = req.body;

    // Validate required fields based on Order model schema
    if (!orderData.items || !orderData.items.length) {
      throw new ApiError("Order items are required", 400);
    }

    // Validate each item has required fields
    for (const [index, item] of orderData.items.entries()) {
      if (!item.productId) {
        throw new ApiError(`Item ${index + 1}: Product ID is required`, 400);
      }
      if (!item.quantity || item.quantity < 1) {
        throw new ApiError(
          `Item ${index + 1}: Valid quantity is required`,
          400
        );
      }
    }

    if (!orderData.shippingAddress) {
      throw new ApiError("Shipping address is required", 400);
    }

    // Required shipping address fields
    const requiredShippingFields = [
      "firstName",
      "lastName",
      "phone",
      "email",
      "city",
      "street",
      "zipCode",
    ];

    for (const field of requiredShippingFields) {
      if (!orderData.shippingAddress[field]) {
        throw new ApiError(`Shipping address ${field} is required`, 400);
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(orderData.shippingAddress.email)) {
      throw new ApiError("Please provide a valid email address", 400);
    }

    if (!orderData.paymentMethod) {
      throw new ApiError("Payment method is required", 400);
    }

    // Validate payment method
    const validPaymentMethods = ["cash_on_delivery", "credit_card", "online"];
    if (!validPaymentMethods.includes(orderData.paymentMethod)) {
      throw new ApiError(
        `Payment method must be one of: ${validPaymentMethods.join(", ")}`,
        400
      );
    }

    if (!orderData.termsAccepted) {
      throw new ApiError("You must accept the terms and conditions", 400);
    }

    // Validate invoice type if provided
    if (
      orderData.invoiceType &&
      !["regular", "corporate"].includes(orderData.invoiceType)
    ) {
      throw new ApiError("Invoice type must be 'regular' or 'corporate'", 400);
    }

    // Validate delivery time if provided
    if (orderData.shippingAddress.deliveryTime) {
      const validDeliveryTimes = [
        "8am-12pm",
        "12pm-4pm",
        "4pm-8pm",
        "after_8pm",
      ];
      if (
        !validDeliveryTimes.includes(orderData.shippingAddress.deliveryTime)
      ) {
        throw new ApiError(
          `Delivery time must be one of: ${validDeliveryTimes.join(", ")}`,
          400
        );
      }
    }

    // Validate collection time if provided
    if (orderData.shippingAddress.collectionTime) {
      const validCollectionTimes = ["before_5pm", "after_5pm", "next_day", ""];
      if (
        !validCollectionTimes.includes(orderData.shippingAddress.collectionTime)
      ) {
        throw new ApiError(
          `Collection time must be one of: ${validCollectionTimes
            .slice(0, 3)
            .join(", ")}`,
          400
        );
      }
    }

    // Validate hire occasion if provided
    if (orderData.shippingAddress.hireOccasion) {
      const validOccasions = [
        "birthday",
        "wedding",
        "corporate_event",
        "school_event",
        "community_event",
        "private_party",
        "other",
      ];
      if (!validOccasions.includes(orderData.shippingAddress.hireOccasion)) {
        throw new ApiError(
          `Hire occasion must be one of: ${validOccasions.join(", ")}`,
          400
        );
      }
    }

    // Create order using service
    const order = await orderService.createOrder(userId, orderData);

    // Return response with order details
    ApiResponse(res, 201, "Order created successfully", {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotalAmount: order.subtotalAmount,
        deliveryFee: order.deliveryFee,
        overnightFee: order.overnightFee,
        discountAmount: order.discountAmount,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        invoiceType: order.invoiceType,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
        items: order.items.map((item: any) => ({
          product: item.product,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          startDate: item.startDate,
          endDate: item.endDate,
          hireOccasion: item.hireOccasion,
          keepOvernight: item.keepOvernight,
        })),
        shippingAddress: {
          firstName: order.shippingAddress.firstName,
          lastName: order.shippingAddress.lastName,
          phone: order.shippingAddress.phone,
          email: order.shippingAddress.email,
          country: order.shippingAddress.country,
          city: order.shippingAddress.city,
          street: order.shippingAddress.street,
          zipCode: order.shippingAddress.zipCode,
          apartment: order.shippingAddress.apartment,
          companyName: order.shippingAddress.companyName,
          deliveryTime: order.shippingAddress.deliveryTime,
          collectionTime: order.shippingAddress.collectionTime,
          hireOccasion: order.shippingAddress.hireOccasion,
          keepOvernight: order.shippingAddress.keepOvernight,
        },
        termsAccepted: order.termsAccepted,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
      message: "Order placed successfully and customer profile created/updated",
    });
  }
);
