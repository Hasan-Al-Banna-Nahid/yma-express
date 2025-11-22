// src/services/checkout.service.ts
import mongoose, { Types } from "mongoose";
import Cart from "../models/cart.model";
import Order, { IOrderModel } from "../models/order.model";
import Product from "../models/product.model";
import ApiError from "../utils/apiError";
import { sendOrderConfirmationEmail } from "./email.service";

export interface CreateOrderData {
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    state: string;
    city: string;
    street: string;
    zipCode: string;
    apartment?: string;
    companyName?: string;
    locationAccessibility?: string;
    deliveryTime?: string;
    collectionTime?: string;
    floorType?: string;
    userType?: string;
    keepOvernight?: boolean;
    hireOccasion?: string;
    notes?: string;
    differentBillingAddress?: boolean;
    billingFirstName?: string;
    billingLastName?: string;
    billingStreet?: string;
    billingCity?: string;
    billingState?: string;
    billingZipCode?: string;
    billingCompanyName?: string;
  };
  paymentMethod: "cash_on_delivery" | "online";
  termsAccepted: boolean;
  invoiceType?: "regular" | "corporate";
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    iban?: string;
    swiftCode?: string;
  };
}

export const createOrderFromCart = async (
  userId: string,
  orderData: CreateOrderData
): Promise<IOrderModel> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("🛒 [SERVICE] Starting order creation for user:", userId);
    console.log("📍 Shipping Address:", {
      country: orderData.shippingAddress.country,
      state: orderData.shippingAddress.state,
      city: orderData.shippingAddress.city,
    });

    // Get user's cart with populated items
    const cart = await Cart.findOne({ user: new Types.ObjectId(userId) })
      .populate<{ product: any }>("items.product")
      .session(session);

    if (!cart || cart.items.length === 0) {
      throw new ApiError("Cart is empty", 400);
    }

    // Validate shipping address - FIXED: Use type-safe field access
    const requiredAddressFields: (keyof CreateOrderData["shippingAddress"])[] =
      [
        "firstName",
        "lastName",
        "email",
        "phone",
        "country",
        "state",
        "city",
        "street",
        "zipCode",
      ];

    const missingFields = requiredAddressFields.filter((field) => {
      const value = orderData.shippingAddress[field];
      return value === undefined || value === null || value === "";
    });

    if (missingFields.length > 0) {
      throw new ApiError(
        `Missing shipping address fields: ${missingFields.join(", ")}`,
        400
      );
    }

    // Validate billing address if different billing address is selected - FIXED: Type-safe access
    if (orderData.shippingAddress.differentBillingAddress) {
      const requiredBillingFields: (keyof CreateOrderData["shippingAddress"])[] =
        [
          "billingFirstName",
          "billingLastName",
          "billingStreet",
          "billingCity",
          "billingState",
          "billingZipCode",
        ];

      const missingBillingFields = requiredBillingFields.filter((field) => {
        const value = orderData.shippingAddress[field];
        return value === undefined || value === null || value === "";
      });

      if (missingBillingFields.length > 0) {
        throw new ApiError(
          `Missing billing address fields: ${missingBillingFields.join(", ")}`,
          400
        );
      }
    }

    // Validate corporate invoice requirements - FIXED: Type-safe access
    if (orderData.invoiceType === "corporate") {
      if (!orderData.bankDetails) {
        throw new ApiError(
          "Bank details are required for corporate invoices",
          400
        );
      }

      const requiredBankFields: (keyof NonNullable<
        CreateOrderData["bankDetails"]
      >)[] = ["bankName", "accountNumber", "accountHolder"];

      const missingBankFields = requiredBankFields.filter((field) => {
        const value = orderData.bankDetails![field];
        return value === undefined || value === null || value === "";
      });

      if (missingBankFields.length > 0) {
        throw new ApiError(
          `Missing bank details: ${missingBankFields.join(", ")}`,
          400
        );
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

    // Create order
    const order = new Order({
      user: new Types.ObjectId(userId),
      items: orderItems,
      totalAmount,
      paymentMethod: orderData.paymentMethod,
      shippingAddress: orderData.shippingAddress,
      termsAccepted: orderData.termsAccepted,
      estimatedDeliveryDate,
      invoiceType: orderData.invoiceType || "regular",
      bankDetails: orderData.bankDetails,
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
