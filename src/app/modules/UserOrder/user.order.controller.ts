import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as orderService from "./order.service";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import ApiError from "../../utils/apiError";

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user._id.toString();

  const orders = await orderService.getOrdersByUserId(userId);

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: {
      orders,
    },
  });
});

export const getMyOrder = asyncHandler(async (req: Request, res: Response) => {
  const orderId = req.params.id;
  const userId = (req as AuthenticatedRequest).user._id.toString();

  const order = await orderService.getOrderById(orderId);

  // Check if order belongs to user
  if (order.user._id.toString() !== userId) {
    throw new ApiError("You are not authorized to view this order", 403);
  }

  res.status(200).json({
    status: "success",
    data: {
      order,
    },
  });
});
