// src/services/order.service.ts
import Order, { IOrder } from "../UserOrder/order.model";
import ApiError from "../../utils/apiError";
import mongoose from "mongoose";
import { generateInvoiceHtml } from "../Invoice/invoice.service";
import {
  sendOrderConfirmationEmail,
  sendInvoiceEmail,
  sendDeliveryReminderEmail,
  sendPreDeliveryConfirmationEmail,
} from "../Email/email.service";

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export interface CreateOrderData {
  user: mongoose.Types.ObjectId;
  items: Array<{
    product: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
    price: number;
    startDate?: Date;
    endDate?: Date;
  }>;
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    apartment?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    deliveryTime?: string;
    notes?: string;
  };
  paymentMethod: "cash_on_delivery" | "bank_transfer" | "credit_card";
  totalAmount: number;
  estimatedDeliveryDate: Date;
}

export const createOrder = async (
  orderData: CreateOrderData
): Promise<IOrder> => {
  try {
    // Generate order number
    const prefix = "YMA";
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const orderNumber = `${prefix}-${timestamp}-${random}`;

    const order = await Order.create({
      ...orderData,
      orderNumber,
      status: "pending",
    });

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone")
      .populate("items.product", "name imageCover price");
    if (!populatedOrder) {
      throw new ApiError("Failed to retrieve populated order", 500);
    }
    return populatedOrder;
  } catch (error: any) {
    throw new ApiError("Failed to create order", 500);
  }
};

export const getOrderById = async (orderId: string): Promise<IOrder> => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId)
    .populate("user", "name email phone")
    .populate("items.product", "name imageCover price");

  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  return order;
};

export const getAllOrders = async (
  page: number = 1,
  limit: number = 10,
  status?: string,
  startDate?: string,
  endDate?: string,
  search?: string
): Promise<{ orders: IOrder[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (status) filter.status = status;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { "shippingAddress.firstName": { $regex: search, $options: "i" } },
      { "shippingAddress.lastName": { $regex: search, $options: "i" } },
      { "shippingAddress.email": { $regex: search, $options: "i" } },
      { "shippingAddress.phone": { $regex: search, $options: "i" } },
    ];
  }

  const orders = await Order.find(filter)
    .populate("user", "name email phone")
    .populate("items.product", "name imageCover price")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Order.countDocuments(filter);

  return {
    orders,
    total,
    pages: Math.ceil(total / limit),
  };
};

export const updateOrder = async (
  orderId: string,
  updateData: Partial<IOrder>
): Promise<IOrder> => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  // Don't allow updating order number
  if (updateData.orderNumber) {
    delete updateData.orderNumber;
  }

  Object.assign(order, updateData);
  await order.save();

  const populatedOrder = await Order.findById(order._id)
    .populate("user", "name email phone")
    .populate("items.product", "name imageCover price");
  if (!populatedOrder) {
    throw new ApiError("Failed to retrieve populated order after update", 500);
  }
  return populatedOrder;
};

export const updateOrderStatus = async (
  orderId: string,
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled",
  adminNotes?: string
): Promise<IOrder> => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId)
    .populate("user", "name email")
    .populate("items.product", "name imageCover price");

  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  const previousStatus = order.status;
  order.status = status;

  if (status === "delivered") {
    order.deliveryDate = new Date();
  }

  if (adminNotes) {
    order.adminNotes = adminNotes;
  }

  await order.save();

  // Send emails based on status change
  if (status === "confirmed" && previousStatus !== "confirmed") {
    // Send order confirmation email with invoice attached
    await sendOrderConfirmationEmail(order);

    // Generate and send invoice
    const invoiceHtml = await generateInvoiceHtml(order);
    await sendInvoiceEmail(order, invoiceHtml);
  }

  return order;
};

export const deleteOrder = async (orderId: string): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  // Only allow deleting pending or cancelled orders
  if (!["pending", "cancelled"].includes(order.status)) {
    throw new ApiError(
      "Cannot delete orders that are confirmed, shipped, or delivered",
      400
    );
  }

  await order.deleteOne();
};

export const getOrderStats = async (): Promise<OrderStats> => {
  const [
    totalOrders,
    pendingOrders,
    confirmedOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: "pending" }),
    Order.countDocuments({ status: "confirmed" }),
    Order.countDocuments({ status: "shipped" }),
    Order.countDocuments({ status: "delivered" }),
    Order.countDocuments({ status: "cancelled" }),
  ]);

  const revenueResult = await Order.aggregate([
    { $match: { status: { $in: ["confirmed", "shipped", "delivered"] } } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  const monthlyRevenueResult = await Order.aggregate([
    {
      $match: {
        status: { $in: ["confirmed", "shipped", "delivered"] },
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  return {
    totalOrders,
    pendingOrders,
    confirmedOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    totalRevenue: revenueResult[0]?.total || 0,
    monthlyRevenue: monthlyRevenueResult[0]?.total || 0,
  };
};

export const getOrdersForDeliveryReminders = async (): Promise<IOrder[]> => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  return await Order.find({
    status: { $in: ["confirmed", "shipped"] },
    estimatedDeliveryDate: {
      $gte: tomorrow,
      $lt: dayAfterTomorrow,
    },
  })
    .populate("user", "name email")
    .populate("items.product", "name imageCover price");
};

export const searchOrders = async (
  query: string,
  page: number = 1,
  limit: number = 10
): Promise<{ orders: IOrder[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;

  const searchFilter = {
    $or: [
      { orderNumber: { $regex: query, $options: "i" } },
      { "shippingAddress.firstName": { $regex: query, $options: "i" } },
      { "shippingAddress.lastName": { $regex: query, $options: "i" } },
      { "shippingAddress.email": { $regex: query, $options: "i" } },
      { "shippingAddress.phone": { $regex: query, $options: "i" } },
    ],
  };

  const orders = await Order.find(searchFilter)
    .populate("user", "name email phone")
    .populate("items.product", "name imageCover price")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Order.countDocuments(searchFilter);

  return {
    orders,
    total,
    pages: Math.ceil(total / limit),
  };
};

export const getOrdersByUserId = async (userId: string): Promise<IOrder[]> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError("Invalid user ID", 400);
  }

  return await Order.find({ user: new mongoose.Types.ObjectId(userId) })
    .populate("items.product", "name imageCover price")
    .sort({ createdAt: -1 });
};
