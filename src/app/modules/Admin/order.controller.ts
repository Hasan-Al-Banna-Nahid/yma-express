// src/controllers/admin/order.controller.ts
import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as orderService from "../Order/order.service";
import ApiError from "../../utils/apiError";
import { sendDeliveryReminderEmail } from "../Email/email.service";

export const getAllOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const search = req.query.search as string;

    const result = await orderService.getAllOrders(
      page,
      limit,
      status,
      startDate,
      endDate,
      search
    );

    res.status(200).json({
      status: "success",
      data: {
        orders: result.orders,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: result.pages,
        },
      },
    });
  }
);

export const getOrderById = asyncHandler(
  async (req: Request, res: Response) => {
    const orderId = req.params.id;
    const order = await orderService.getOrderById(orderId);

    res.status(200).json({
      status: "success",
      data: {
        order,
      },
    });
  }
);

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const orderData = req.body;

  // Validate required fields
  if (!orderData.user || !orderData.items || !orderData.shippingAddress) {
    throw new ApiError("Missing required fields", 400);
  }

  const order = await orderService.createOrder(orderData);

  res.status(201).json({
    status: "success",
    data: {
      order,
    },
  });
});

export const updateOrder = asyncHandler(async (req: Request, res: Response) => {
  const orderId = req.params.id;
  const updateData = req.body;

  const order = await orderService.updateOrder(orderId, updateData);

  res.status(200).json({
    status: "success",
    data: {
      order,
    },
  });
});

export const updateOrderStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const orderId = req.params.id;
    const { status, adminNotes } = req.body;

    if (
      !status ||
      !["pending", "confirmed", "shipped", "delivered", "cancelled"].includes(
        status
      )
    ) {
      throw new ApiError("Invalid status", 400);
    }

    const order = await orderService.updateOrderStatus(
      orderId,
      status as "pending" | "confirmed" | "shipped" | "delivered" | "cancelled",
      adminNotes
    );

    res.status(200).json({
      status: "success",
      data: {
        order,
      },
    });
  }
);

export const deleteOrder = asyncHandler(async (req: Request, res: Response) => {
  const orderId = req.params.id;
  await orderService.deleteOrder(orderId);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const getOrderStats = asyncHandler(
  async (req: Request, res: Response) => {
    const stats = await orderService.getOrderStats();

    res.status(200).json({
      status: "success",
      data: {
        stats,
      },
    });
  }
);

export const searchOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query) {
      throw new ApiError("Search query is required", 400);
    }

    const result = await orderService.searchOrders(query, page, limit);

    res.status(200).json({
      status: "success",
      data: {
        orders: result.orders,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: result.pages,
        },
      },
    });
  }
);

export const getOrdersByUser = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.params.userId;
    const orders = await orderService.getOrdersByUserId(userId);

    res.status(200).json({
      status: "success",
      results: orders.length,
      data: {
        orders,
      },
    });
  }
);

export const sendDeliveryReminders = asyncHandler(
  async (req: Request, res: Response) => {
    const orders = await orderService.getOrdersForDeliveryReminders();

    // Send reminder emails
    for (const order of orders) {
      await sendDeliveryReminderEmail(order);
    }

    res.status(200).json({
      status: "success",
      message: `Delivery reminders sent for ${orders.length} orders`,
      data: {
        ordersCount: orders.length,
      },
    });
  }
);

export const getDeliveryReminderOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const orders = await orderService.getOrdersForDeliveryReminders();

    res.status(200).json({
      status: "success",
      results: orders.length,
      data: {
        orders,
      },
    });
  }
);
