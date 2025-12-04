// src/services/order.service.ts
import mongoose, { Types } from "mongoose";
import Cart from "../modules/Cart/cart.model";
import Order, { IOrderModel } from "../models/order.model";
import Product from "../models/product.model";
import ApiError from "../utils/apiError";
import { generateInvoiceHtml } from "./invoice.service";
import { sendOrderConfirmationEmail, sendInvoiceEmail } from "./email.service";

export interface CreateOrderData {
  shippingAddress: any;
  paymentMethod: "cash_on_delivery" | "online";
  termsAccepted: boolean;
  invoiceType?: "regular" | "corporate";
  bankDetails?: {
    bankInfo: string; // Simplified to single field
  };
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export const createOrderFromCart = async (
  userId: string,
  orderData: CreateOrderData
): Promise<IOrderModel> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("🛒 [SERVICE] Starting order creation for user:", userId);

    // Get user's cart with populated items
    const cart = await Cart.findOne({ user: new Types.ObjectId(userId) })
      .populate<{ product: any }>("items.product")
      .session(session);

    if (!cart || cart.items.length === 0) {
      throw new ApiError("Cart is empty", 400);
    }

    // Validate corporate invoice requirements - SIMPLIFIED
    if (orderData.invoiceType === "corporate") {
      if (!orderData.bankDetails || !orderData.bankDetails.bankInfo) {
        throw new ApiError(
          "Bank details are required for corporate invoices",
          400
        );
      }

      // Validate that bank info is not empty
      if (orderData.bankDetails.bankInfo.trim() === "") {
        throw new ApiError("Bank information cannot be empty", 400);
      }
    }

    // Validate stock and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const cartItem of cart.items) {
      const productId = (cartItem.product as any)._id || cartItem.product;
      const product = await Product.findById(productId).session(session);

      if (!product) {
        throw new ApiError(`Product not found`, 404);
      }

      if (product.stock < cartItem.quantity) {
        throw new ApiError(
          `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}`,
          400
        );
      }

      // Update product stock
      product.stock -= cartItem.quantity;
      await product.save({ session });

      // Create order item
      const orderItem = {
        product: product._id,
        quantity: cartItem.quantity,
        price: cartItem.price,
        name: product.name,
        startDate: cartItem.startDate,
        endDate: cartItem.endDate,
      };

      orderItems.push(orderItem);
      totalAmount += cartItem.quantity * cartItem.price;
    }

    // Calculate estimated delivery date (2 days from now)
    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 2);

    // Create order with simplified bank details
    const order = new Order({
      user: new Types.ObjectId(userId),
      items: orderItems,
      totalAmount,
      paymentMethod: orderData.paymentMethod,
      shippingAddress: orderData.shippingAddress,
      termsAccepted: orderData.termsAccepted,
      estimatedDeliveryDate,
      invoiceType: orderData.invoiceType || "regular",
      bankDetails: orderData.bankDetails, // Now just { bankInfo: string }
    });

    await order.save({ session });

    // Clear cart
    cart.items = [];
    cart.totalPrice = 0;
    cart.totalItems = 0;
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Send order confirmation email
    const populatedOrder = await order.populate([
      { path: "user", select: "name email" },
      { path: "items.product" },
    ]);

    await sendOrderConfirmationEmail(populatedOrder);

    console.log("✅ [SERVICE] Order created successfully:", order.orderNumber);
    return populatedOrder;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ [SERVICE] Order creation failed:", error);
    throw error;
  }
};

// ... rest of the methods remain the same
export const getOrderById = async (orderId: string): Promise<IOrderModel> => {
  const order = await Order.findById(orderId)
    .populate("user", "name email phone")
    .populate("items.product");

  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  return order;
};

export const getUserOrders = async (userId: string): Promise<IOrderModel[]> => {
  return await Order.find({ user: new Types.ObjectId(userId) })
    .populate("items.product")
    .sort({ createdAt: -1 });
};

export const getAllOrders = async (
  page: number = 1,
  limit: number = 10,
  status?: string,
  startDate?: string,
  endDate?: string
): Promise<{ orders: IOrderModel[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (status) filter.status = status;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const orders = await Order.find(filter)
    .populate("user", "name email phone")
    .populate("items.product")
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

export const updateOrderStatus = async (
  orderId: string,
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled",
  adminNotes?: string
): Promise<IOrderModel> => {
  const order = await Order.findById(orderId)
    .populate("user", "name email")
    .populate("items.product");

  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  const previousStatus = order.status;
  order.status = status;

  if (status === "delivered") {
    order.deliveryDate = new Date();
  }

  if (adminNotes) {
    (order as any).adminNotes = adminNotes;
  }

  await order.save();

  // Send status update email if order is confirmed
  if (status === "confirmed" && previousStatus !== "confirmed") {
    await sendOrderConfirmationEmail(order);

    // Generate and send invoice
    const invoiceHtml = await generateInvoiceHtml(order);
    await sendInvoiceEmail(order, invoiceHtml);
  }

  return order;
};

export const getOrderStats = async (): Promise<OrderStats> => {
  const totalOrders = await Order.countDocuments();
  const pendingOrders = await Order.countDocuments({ status: "pending" });
  const confirmedOrders = await Order.countDocuments({ status: "confirmed" });
  const deliveredOrders = await Order.countDocuments({ status: "delivered" });

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
    deliveredOrders,
    totalRevenue: revenueResult[0]?.total || 0,
    monthlyRevenue: monthlyRevenueResult[0]?.total || 0,
  };
};

export const generateOrderInvoice = async (
  orderId: string
): Promise<string> => {
  const order = await Order.findById(orderId)
    .populate("user", "name email phone")
    .populate("items.product");

  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  return await generateInvoiceHtml(order);
};

export const searchOrders = async (
  query: string,
  page: number = 1,
  limit: number = 10
): Promise<{ orders: IOrderModel[]; total: number; pages: number }> => {
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
    .populate("items.product")
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
