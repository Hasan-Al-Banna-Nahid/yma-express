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

export const createOrderFromCart = async (
  userId: string,
  orderData: CreateOrderData
): Promise<IOrder> => {
  try {
    console.log("🛒 [CHECKOUT SERVICE] Creating order for user:", userId);

    // Get user's cart
    const cart = await Cart.findOne({ user: new Types.ObjectId(userId) });

    if (!cart) {
      throw new ApiError("Cart not found", 404);
    }

    if (!cart.items || cart.items.length === 0) {
      throw new ApiError("Cart is empty", 400);
    }

    console.log(`🛒 Cart has ${cart.items.length} items`);

    // Validate shipping address
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

    // Validate billing address if different billing address is selected
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

    // Validate corporate invoice requirements
    if (orderData.invoiceType === "corporate") {
      if (!orderData.bankDetails || orderData.bankDetails.trim() === "") {
        throw new ApiError(
          "Bank details are required for corporate invoices",
          400
        );
      }
    }

    // Validate stock and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const cartItem of cart.items) {
      console.log("🛒 Processing cart item:", cartItem);

      // Get the product ID with proper type handling
      let productId: Types.ObjectId | null = null;

      if (typeof cartItem.product === "string") {
        productId = new Types.ObjectId(cartItem.product);
      } else if (cartItem.product instanceof Types.ObjectId) {
        productId = cartItem.product;
      } else if (cartItem.product && typeof cartItem.product === "object") {
        // Type assertion to handle the 'never' type
        const productObj = cartItem.product as any;
        if (productObj._id) {
          productId =
            productObj._id instanceof Types.ObjectId
              ? productObj._id
              : new Types.ObjectId(productObj._id);
        }
      }

      // Skip if no valid product ID found
      if (!productId) {
        console.warn(
          "⚠️ Skipping cart item with null/invalid product:",
          cartItem
        );
        continue;
      }

      console.log(`🛒 Product ID extracted: ${productId}`);

      // Find the product by ID
      const product: IProductModel | null = await Product.findById(productId);

      if (!product) {
        console.error(`❌ Product not found for ID: ${productId}`);
        throw new ApiError(`Product not found (ID: ${productId})`, 404);
      }

      console.log(
        `✅ Found product: ${product.name}, Stock: ${product.stock}, Requested: ${cartItem.quantity}`
      );

      if (product.stock < cartItem.quantity) {
        throw new ApiError(
          `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}`,
          400
        );
      }

      // Update product stock
      await Product.findByIdAndUpdate(productId, {
        $inc: { stock: -cartItem.quantity },
        $set: { updatedAt: new Date() },
      });

      console.log(
        `✅ Updated stock for ${product.name}, New stock: ${
          product.stock - cartItem.quantity
        }`
      );

      // Create order item
      const orderItem = {
        product: productId,
        quantity: cartItem.quantity,
        price: cartItem.price,
        name: product.name,
        startDate: cartItem.startDate,
        endDate: cartItem.endDate,
      };

      orderItems.push(orderItem);
      totalAmount += cartItem.quantity * cartItem.price;

      console.log(
        `💰 Item subtotal: ${cartItem.quantity} x ${cartItem.price} = ${
          cartItem.quantity * cartItem.price
        }`
      );
    }

    // Check if we have any valid order items after processing
    if (orderItems.length === 0) {
      throw new ApiError("No valid items in cart to create order", 400);
    }

    console.log(`💰 Total amount: ${totalAmount}`);

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
      bankDetails: orderData.bankDetails || "",
    });

    await order.save();
    console.log(`✅ Order created with ID: ${order._id}`);

    // Clear cart
    cart.items = [];
    cart.totalPrice = 0;
    cart.totalItems = 0;
    await cart.save();
    console.log(`✅ Cart cleared for user: ${userId}`);

    // Try to send email (but don't fail the order if email fails)
    try {
      const populatedOrder = await Order.findById(order._id).populate([
        { path: "user", select: "name email" },
        { path: "items.product", select: "name imageCover price" },
      ]);

      if (populatedOrder) {
        await sendOrderConfirmationEmail(populatedOrder);
        console.log(`✅ Order confirmation email sent for order: ${order._id}`);
      }
    } catch (emailError) {
      console.error("⚠️ Failed to send order confirmation email:", emailError);
      // Don't throw - order was created successfully
    }

    console.log("✅ [CHECKOUT SERVICE] Order creation completed successfully");

    // Return the populated order
    const finalOrder = await Order.findById(order._id).populate([
      { path: "user", select: "name email" },
      { path: "items.product", select: "name imageCover price" },
    ]);

    return finalOrder || order;
  } catch (error) {
    console.error("❌ [CHECKOUT SERVICE] Order creation failed:", error);
    throw error;
  }
};
