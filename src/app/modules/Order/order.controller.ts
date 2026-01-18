// src/modules/order/order.controller.ts
import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import ApiError from "../../utils/apiError";
import { ApiResponse } from "../../utils/apiResponse";
import * as orderService from "./order.service";
import mongoose from "mongoose";

export const createOrderHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const aReq = req as any;
    const userId = aReq.user.id;
    const orderData = req.body;

    // Basic validation
    if (!orderData.items || !orderData.items.length) {
      throw new ApiError("Order items are required", 400);
    }

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

    // Required shipping fields
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

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(orderData.shippingAddress.email)) {
      throw new ApiError("Please provide a valid email address", 400);
    }

    if (!orderData.paymentMethod) {
      throw new ApiError("Payment method is required", 400);
    }

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

    // Create order
    const order = await orderService.createOrder(userId, orderData);

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

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const aReq = req as any;
  const userId = aReq.user.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const result = await orderService.getOrdersByUserId(userId, page, limit);

  ApiResponse(res, 200, "Orders retrieved successfully", result);
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const aReq = req as any;
  const userId = aReq.user.id;
  const isAdmin = aReq.user.role === "admin";

  const order = await orderService.getOrderById(id);

  // Check authorization
  if (!isAdmin && order.user.toString() !== userId.toString()) {
    throw new ApiError("Not authorized to view this order", 403);
  }

  ApiResponse(res, 200, "Order retrieved successfully", { order });
});

export const updateOrderHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const aReq = req as any;
    const userId = aReq.user.id;
    const isAdmin = aReq.user.role === "admin";
    const updateData = req.body;

    const order = await orderService.updateOrder(
      id,
      updateData,
      userId,
      isAdmin
    );

    ApiResponse(res, 200, "Order updated successfully", { order });
  }
);

export const deleteOrderHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const aReq = req as any;
    const userId = aReq.user.id;

    await orderService.deleteOrder(id, userId);

    ApiResponse(res, 200, "Order deleted successfully");
  }
);

// Admin controllers
export const getAllOrdersHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const filters: any = {
      status: req.query.status as string,
      paymentMethod: req.query.paymentMethod as string,
      userId: req.query.userId as string,
      search: req.query.search as string,
      startDate: req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined,
      endDate: req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined,
      minAmount: req.query.minAmount
        ? parseFloat(req.query.minAmount as string)
        : undefined,
      maxAmount: req.query.maxAmount
        ? parseFloat(req.query.maxAmount as string)
        : undefined,
    };

    const result = await orderService.getAllOrders(page, limit, filters);

    ApiResponse(res, 200, "Orders retrieved successfully", result);
  }
);

export const getOrderStatsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const stats = await orderService.getOrderStatistics();
    ApiResponse(res, 200, "Order statistics retrieved", stats);
  }
);

export const getDashboardStatsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const stats = await orderService.getDashboardStats();
    ApiResponse(res, 200, "Dashboard stats retrieved successfully", stats);
  }
);

export const getRevenueOverTimeHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { startDate, endDate, interval = "day" } = req.query;

    if (!startDate || !endDate) {
      throw new ApiError("startDate and endDate are required", 400);
    }

    const revenueData = await orderService.getRevenueOverTime(
      new Date(startDate as string),
      new Date(endDate as string),
      interval as "day" | "week" | "month"
    );

    ApiResponse(res, 200, "Revenue over time", revenueData);
  }
);

export const getOrderSummaryHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const summary = await orderService.getOrderSummary(orderId);
    ApiResponse(res, 200, "Order summary", summary);
  }
);

export const updateOrderStatusHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!status) {
      throw new ApiError("Status is required", 400);
    }

    const order = await orderService.updateOrderStatus(id, status, adminNotes);
    ApiResponse(res, 200, "Order status updated", { order });
  }
);

export const getUserOrdersHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await orderService.getOrdersByUserId(userId, page, limit);
    ApiResponse(res, 200, "User orders retrieved", result);
  }
);

export const searchOrdersHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const searchTerm = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new ApiError("Search term must be at least 2 characters", 400);
    }

    const result = await orderService.searchOrders(searchTerm, page, limit);
    ApiResponse(res, 200, "Search results", result);
  }
);

export const generateInvoiceHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const aReq = req as any;
    const userId = aReq.user.id;
    const isAdmin = aReq.user.role === "admin";

    const result = await orderService.generateInvoice(orderId, userId, isAdmin);
    ApiResponse(res, 200, result.message, result);
  }
);

export const downloadInvoiceHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const aReq = req as any;
    const userId = aReq.user.id;
    const isAdmin = aReq.user.role === "admin";

    const { html, filename } = await orderService.downloadInvoice(
      orderId,
      userId,
      isAdmin
    );

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(html);
  }
);

export const previewInvoiceHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const aReq = req as any;
    const userId = aReq.user.id;
    const isAdmin = aReq.user.role === "admin";

    const html = await orderService.previewInvoice(orderId, userId, isAdmin);

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  }
);
