import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import ApiError from "../../utils/apiError";
import { ApiResponse } from "../../utils/apiResponse";
import * as orderService from "./order.service";
import mongoose from "mongoose";

// Get all orders (Admin only)
export const getAllOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      page = "1",
      limit = "20",
      status,
      startDate,
      endDate,
      search,
      userId,
      paymentMethod,
      minAmount,
      maxAmount,
    } = req.query;

    const filters: any = {};

    if (status && status !== "all") filters.status = status;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (search && search.toString().trim())
      filters.search = search.toString().trim();
    if (userId) filters.userId = userId as string;
    if (paymentMethod && paymentMethod !== "all")
      filters.paymentMethod = paymentMethod;
    if (minAmount) filters.minAmount = parseFloat(minAmount as string);
    if (maxAmount) filters.maxAmount = parseFloat(maxAmount as string);

    const result = await orderService.getAllOrders(
      parseInt(page as string),
      parseInt(limit as string),
      filters
    );

    ApiResponse(res, 200, "Orders retrieved successfully", {
      orders: result.orders,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: result.total,
        pages: result.pages,
      },
    });
  }
);

// Get order by ID
export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const order = await orderService.getOrderById(id);
  ApiResponse(res, 200, "Order retrieved successfully", { order });
});

// Create new order
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const orderData = req.body;
  const aReq = req as any;
  orderData.user = aReq.user?.id || orderData.user;

  const order = await orderService.createOrder(orderData);
  ApiResponse(res, 201, "Order created successfully", { order });
});

// Update order
export const updateOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;
  const userId = (req as any).user?._id;
  const isAdmin = (req as any).user?.role === "admin";

  const order = await orderService.updateOrder(id, updateData, userId, isAdmin);
  ApiResponse(res, 200, "Order updated successfully", { order });
});

// Update order status
export const updateOrderStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!status) throw new ApiError("Status is required", 400);

    const validStatuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      throw new ApiError(
        `Status must be one of: ${validStatuses.join(", ")}`,
        400
      );
    }

    const order = await orderService.updateOrderStatus(
      id,
      status as any,
      adminNotes
    );
    ApiResponse(res, 200, `Order ${status} successfully`, { order });
  }
);

// Delete order
export const deleteOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await orderService.deleteOrder(id);
  ApiResponse(res, 200, "Order deleted successfully");
});

// Get order statistics
export const getOrderStats = asyncHandler(
  async (req: Request, res: Response) => {
    const stats = await orderService.getOrderStatistics();
    ApiResponse(res, 200, "Order statistics retrieved", { stats });
  }
);

// Get user's orders
export const getUserOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { page = "1", limit = "10" } = req.query;

    const result = await orderService.getOrdersByUserId(
      userId,
      parseInt(page as string),
      parseInt(limit as string)
    );

    ApiResponse(res, 200, "User orders retrieved", {
      orders: result.orders,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: result.total,
        pages: result.pages,
      },
    });
  }
);

// Get my orders
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const aReq = req as any;
  const userId = aReq.user.id;
  const { page = "1", limit = "10" } = req.query;

  const result = await orderService.getOrdersByUserId(
    userId,
    parseInt(page as string),
    parseInt(limit as string)
  );

  ApiResponse(res, 200, "Your orders retrieved", {
    orders: result.orders,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: result.total,
      pages: result.pages,
    },
  });
});

// Search orders
export const searchOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const { q } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!q || !q.toString().trim()) {
      throw new ApiError("Search query is required", 400);
    }

    const result = await orderService.searchOrders(
      q.toString().trim(),
      page,
      limit
    );

    res.status(200).json({
      status: "success",
      data: result,
    });
  }
);

// Get orders by status
export const getOrdersByStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { status } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const validStatuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      throw new ApiError(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        400
      );
    }

    const result = await orderService.getOrdersByStatus(status, page, limit);

    res.status(200).json({
      status: "success",
      data: result,
    });
  }
);

// Get today's orders
export const getTodayOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const orders = await orderService.getTodayOrders();
    ApiResponse(res, 200, "Today's orders retrieved", { orders });
  }
);

// Get pending orders
export const getPendingOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const orders = await orderService.getPendingOrders();
    ApiResponse(res, 200, "Pending orders retrieved", { orders });
  }
);

// Generate and send invoice
export const generateInvoice = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const isAdmin = (req as any).user?.role === "admin";
    const userId = (req as any).user?.id;

    const result = await orderService.generateInvoice(orderId, userId, isAdmin);
    ApiResponse(res, 200, "Invoice sent successfully", result);
  }
);

// Download invoice
export const downloadInvoice = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const isAdmin = (req as any).user?.role === "admin";
    const userId = (req as any).user?.id;

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

// Preview invoice
export const previewInvoice = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const isAdmin = (req as any).user?.role === "admin";
    const userId = (req as any).user?.id;

    const html = await orderService.previewInvoice(orderId, userId, isAdmin);

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  }
);
