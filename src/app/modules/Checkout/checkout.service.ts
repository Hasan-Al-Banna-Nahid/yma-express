import mongoose, { Types } from "mongoose";
import Cart from "../Cart/cart.model";
import Order, { IOrder } from "../UserOrder/order.model";
import Product, { IProductModel } from "../Product/product.model";
import ApiError from "../../utils/apiError";
import { sendOrderConfirmationEmail } from "../Email/email.service";

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
  bankDetails?: string;
}

// checkout.service.ts
export const createOrderFromCart = async (
  userId: Types.ObjectId,
  data: CreateOrderData
) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) {
    throw new ApiError("Cart is empty", 400);
  }

  let totalAmount = 0;
  const orderItems = [];

  for (const item of cart.items) {
    const product = await Product.findById(item.product);
    if (!product) throw new ApiError("Product not found", 404);

    if (product.stock < item.quantity) {
      throw new ApiError(`Insufficient stock for ${product.name}`, 400);
    }

    product.stock -= item.quantity;
    await product.save();

    orderItems.push({
      product: product._id,
      quantity: item.quantity,
      price: item.price,
      name: product.name,
      startDate: item.startDate,
      endDate: item.endDate,
    });

    totalAmount += item.quantity * item.price;
  }

  const order = await Order.create({
    user: userId,
    items: orderItems,
    totalAmount,
    paymentMethod: data.paymentMethod,
    shippingAddress: data.shippingAddress,
    termsAccepted: data.termsAccepted,
    invoiceType: data.invoiceType || "regular",
    bankDetails: data.bankDetails,
  });

  cart.items = [];
  await cart.save();

  return order;
};
