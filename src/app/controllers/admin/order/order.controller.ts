// src/controllers/admin/order.controller.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import * as orderService from "../../../services/order.service";
import ApiError from "../../../utils/apiError";
import { AuthenticatedRequest } from "../../../middlewares/auth.middleware";

export const getAllOrders = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const result = await orderService.getAllOrders(
      page,
      limit,
      status,
      startDate,
      endDate
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

export const getOrderDetails = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
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

export const updateOrderStatus = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const orderId = req.params.id;
    const { status, adminNotes } = req.body;

    if (!status) {
      throw new ApiError("Status is required", 400);
    }

    const validStatuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      throw new ApiError("Invalid status", 400);
    }

    const order = await orderService.updateOrderStatus(
      orderId,
      status,
      adminNotes
    );

    res.status(200).json({
      status: "success",
      message: "Order status updated successfully",
      data: {
        order,
      },
    });
  }
);

export const getOrderStats = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const stats = await orderService.getOrderStats();

    res.status(200).json({
      status: "success",
      data: {
        stats,
      },
    });
  }
);

export const generateInvoice = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const orderId = req.params.id;

    const invoiceHtml = await orderService.generateOrderInvoice(orderId);

    // Set headers for HTML response
    res.setHeader("Content-Type", "text/html");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="invoice-${orderId}.html"`
    );

    res.send(invoiceHtml);
  }
);

export const searchOrders = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query || query.trim().length < 2) {
      throw new ApiError(
        "Search query must be at least 2 characters long",
        400
      );
    }

    const result = await orderService.searchOrders(query.trim(), page, limit);

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
