// src/services/checkout/checkout.service.ts
import mongoose, { Types } from "mongoose";
import Cart from "../../modules/Cart/cart.model";
import Order from "../../modules/Order/order.model";
import { IOrderDocument } from "../../modules/Order/order.interface";
import Product from "../../modules/Product/product.model";
import ApiError from "../../utils/apiError";
import {
  sendOrderNotificationToAdmin,
  sendOrderReceivedEmail,
} from "./email.service";
import {
  DELIVERY_TIME_OPTIONS,
  COLLECTION_TIME_OPTIONS,
  HIRE_OCCASION_OPTIONS,
  PAYMENT_METHODS,
  ORDER_STATUS,
  INVOICE_TYPES,
} from "../../modules/Order/order.interface";

export interface CreateOrderData {
  shippingAddress: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    country: string;
    city: string;
    street: string;
    zipCode: string;
    apartment?: string;
    location?: string;
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
    billingZipCode?: string;
    billingCompanyName?: string;
  };
  paymentMethod: "cash_on_delivery" | "online";
  termsAccepted: boolean;
  invoiceType?: "regular" | "corporate";
  bankDetails?: string;
}

export interface DateAvailabilityResponse {
  startDate: Date;
  endDate: Date;
  available: boolean;
  reason?: string;
}

export const checkCartStock = async (
  userId: Types.ObjectId
): Promise<{ available: boolean; issues: string[] }> => {
  const cart = await Cart.findOne({ user: userId }).populate("items.product");

  if (!cart || cart.items.length === 0) {
    return { available: false, issues: ["Cart is empty"] };
  }

  const issues: string[] = [];

  for (const item of cart.items) {
    const product = await Product.findById(item.product);

    if (!product) {
      issues.push(`Product "${item.product}" not found`);
      continue;
    }

    if (product.stock < item.quantity) {
      issues.push(
        `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
      );
    }
  }

  return {
    available: issues.length === 0,
    issues,
  };
};

export const checkDateAvailability = async (
  productId: Types.ObjectId,
  startDate: Date,
  endDate: Date
): Promise<DateAvailabilityResponse> => {
  const product = await Product.findById(productId);

  if (!product) {
    return {
      startDate,
      endDate,
      available: false,
      reason: "Product not found",
    };
  }

  if (product.stock === 0) {
    return {
      startDate,
      endDate,
      available: false,
      reason: "Product is out of stock",
    };
  }

  // Check if the dates overlap with existing orders for this product
  const overlappingOrders = await Order.find({
    "items.product": productId,
    status: { $nin: ["cancelled", "refunded"] }, // Exclude cancelled/refunded orders
    $or: [
      // Existing order's start date is within requested range
      {
        "items.startDate": { $lte: endDate },
        "items.endDate": { $gte: startDate },
      },
      // Requested dates are within existing order's range
      {
        "items.startDate": { $gte: startDate, $lte: endDate },
      },
    ],
  });

  // Count total quantity booked for this date range
  let totalBooked = 0;
  overlappingOrders.forEach((order) => {
    order.items.forEach((item: any) => {
      if (item.product.toString() === productId.toString()) {
        // Check if dates overlap
        const existingStart = item.startDate ? new Date(item.startDate) : null;
        const existingEnd = item.endDate ? new Date(item.endDate) : null;

        if (existingStart && existingEnd) {
          // Check for date overlap
          if (
            (startDate <= existingEnd && endDate >= existingStart) ||
            (existingStart <= endDate && existingEnd >= startDate)
          ) {
            totalBooked += item.quantity;
          }
        }
      }
    });
  });

  const available = product.stock > totalBooked;

  return {
    startDate,
    endDate,
    available,
    reason: available
      ? undefined
      : `Only ${product.stock - totalBooked} items available for these dates`,
  };
};

export const getAvailableDates = async (
  productId: Types.ObjectId,
  startDate: Date,
  endDate: Date,
  quantity: number = 1
): Promise<{
  availableDates: Array<{ date: Date; available: boolean; quantity: number }>;
  productStock: number;
}> => {
  const product = await Product.findById(productId);

  if (!product) {
    return {
      availableDates: [],
      productStock: 0,
    };
  }

  // Get all orders for this product in the date range
  const orders = await Order.find({
    "items.product": productId,
    status: { $nin: ["cancelled", "refunded"] },
    "items.startDate": { $lte: endDate },
    "items.endDate": { $gte: startDate },
  });

  // Create a map to track booked quantities per day
  const bookedQuantities = new Map<string, number>();

  // Initialize all days in the range with 0 booked
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split("T")[0];
    bookedQuantities.set(dateKey, 0);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Calculate booked quantities for each day
  orders.forEach((order) => {
    order.items.forEach((item: any) => {
      if (
        item.product.toString() === productId.toString() &&
        item.startDate &&
        item.endDate
      ) {
        const itemStart = new Date(item.startDate);
        const itemEnd = new Date(item.endDate);

        // Mark all days in this item's range as booked
        const checkDate = new Date(itemStart);
        while (checkDate <= itemEnd) {
          const dateKey = checkDate.toISOString().split("T")[0];
          const currentBooked = bookedQuantities.get(dateKey) || 0;
          bookedQuantities.set(dateKey, currentBooked + item.quantity);
          checkDate.setDate(checkDate.getDate() + 1);
        }
      }
    });
  });

  // Generate available dates array
  const availableDates = [];
  const checkDate = new Date(startDate);

  while (checkDate <= endDate) {
    const dateKey = checkDate.toISOString().split("T")[0];
    const booked = bookedQuantities.get(dateKey) || 0;
    const available = product.stock - booked >= quantity;

    availableDates.push({
      date: new Date(checkDate),
      available,
      quantity: product.stock - booked,
    });

    checkDate.setDate(checkDate.getDate() + 1);
  }

  return {
    availableDates,
    productStock: product.stock,
  };
};

export const createOrderFromCart = async (
  userId: Types.ObjectId,
  data: CreateOrderData
): Promise<IOrderDocument> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Find cart
    const cart = await Cart.findOne({ user: userId }).session(session);
    if (!cart || cart.items.length === 0) {
      throw new ApiError("Cart is empty", 400);
    }

    // Validate delivery time
    if (data.shippingAddress.deliveryTime) {
      const validDeliveryTimes = DELIVERY_TIME_OPTIONS.map((opt) => opt.value);
      if (
        !validDeliveryTimes.includes(data.shippingAddress.deliveryTime as any)
      ) {
        throw new ApiError("Invalid delivery time selected", 400);
      }
    }

    // Validate collection time
    if (data.shippingAddress.collectionTime) {
      const validCollectionTimes = COLLECTION_TIME_OPTIONS.map(
        (opt) => opt.value
      );
      if (
        !validCollectionTimes.includes(
          data.shippingAddress.collectionTime as any
        )
      ) {
        throw new ApiError("Invalid collection time selected", 400);
      }
    }

    // Validate hire occasion
    if (data.shippingAddress.hireOccasion) {
      if (
        !HIRE_OCCASION_OPTIONS.includes(
          data.shippingAddress.hireOccasion as any
        )
      ) {
        throw new ApiError("Invalid hire occasion", 400);
      }
    }

    // Validate terms accepted
    if (!data.termsAccepted) {
      throw new ApiError("You must accept the terms and conditions", 400);
    }

    // Check stock availability before proceeding
    const stockCheck = await checkCartStock(userId);
    if (!stockCheck.available) {
      throw new ApiError(`Stock issues: ${stockCheck.issues.join(", ")}`, 400);
    }

    // Check date availability for each item with dates
    for (const item of cart.items) {
      if (item.startDate && item.endDate) {
        const dateAvailability = await checkDateAvailability(
          item.product,
          new Date(item.startDate),
          new Date(item.endDate)
        );

        if (!dateAvailability.available) {
          throw new ApiError(
            `Date not available for product in cart: ${dateAvailability.reason}`,
            400
          );
        }
      }
    }

    let subtotalAmount = 0;
    const orderItems = [];

    // Process cart items
    for (const item of cart.items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        throw new ApiError(`Product not found: ${item.product}`, 404);
      }

      // Double-check stock (in case it changed since initial check)
      if (product.stock < item.quantity) {
        throw new ApiError(
          `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
          400
        );
      }

      // Update stock
      product.stock -= item.quantity;
      await product.save({ session });

      // Add to order items - matching the orderItemSchema structure
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: item.price,
        name: product.name,
        startDate: item.startDate,
        endDate: item.endDate,
        hireOccasion: data.shippingAddress.hireOccasion,
        keepOvernight: data.shippingAddress.keepOvernight,
      });

      subtotalAmount += item.quantity * item.price;
    }

    // Calculate fees
    let deliveryFee = 0;
    let overnightFee = 0;

    // Calculate delivery fee
    if (data.shippingAddress.deliveryTime) {
      const deliveryOption = DELIVERY_TIME_OPTIONS.find(
        (opt) => opt.value === data.shippingAddress.deliveryTime
      );
      if (deliveryOption) {
        deliveryFee += deliveryOption.fee;
      }
    }

    // Calculate collection fee
    if (data.shippingAddress.collectionTime) {
      const collectionOption = COLLECTION_TIME_OPTIONS.find(
        (opt) => opt.value === data.shippingAddress.collectionTime
      );
      if (collectionOption) {
        deliveryFee += collectionOption.fee;
      }
    }

    // Calculate overnight fee
    if (data.shippingAddress.keepOvernight) {
      overnightFee = 30; // £30 for overnight keeping
    }

    // Calculate total amount
    const totalAmount = subtotalAmount + deliveryFee + overnightFee;

    // Map payment method to match PAYMENT_METHODS enum
    const paymentMethod =
      data.paymentMethod === "online"
        ? PAYMENT_METHODS.CREDIT_CARD
        : PAYMENT_METHODS.CASH_ON_DELIVERY;

    // Map invoice type to match INVOICE_TYPES enum
    const invoiceType =
      data.invoiceType === "corporate"
        ? INVOICE_TYPES.CORPORATE
        : INVOICE_TYPES.REGULAR;

    // Prepare order data matching the Order schema
    const orderData = {
      user: userId,
      items: orderItems,
      subtotalAmount,
      deliveryFee,
      overnightFee,
      totalAmount,
      paymentMethod,
      status: ORDER_STATUS.PENDING,
      shippingAddress: {
        firstName: data.shippingAddress.firstName,
        lastName: data.shippingAddress.lastName,
        phone: data.shippingAddress.phone,
        email: data.shippingAddress.email,
        country: data.shippingAddress.country,
        city: data.shippingAddress.city,
        street: data.shippingAddress.street,
        zipCode: data.shippingAddress.zipCode,
        apartment: data.shippingAddress.apartment || "",
        location: data.shippingAddress.location || "",
        companyName: data.shippingAddress.companyName || "",
        locationAccessibility: data.shippingAddress.locationAccessibility || "",
        deliveryTime: data.shippingAddress.deliveryTime || "",
        collectionTime: data.shippingAddress.collectionTime || "",
        floorType: data.shippingAddress.floorType || "",
        userType: data.shippingAddress.userType || "",
        keepOvernight: data.shippingAddress.keepOvernight || false,
        hireOccasion: data.shippingAddress.hireOccasion || "",
        notes: data.shippingAddress.notes || "",
        differentBillingAddress:
          data.shippingAddress.differentBillingAddress || false,
        billingFirstName: data.shippingAddress.billingFirstName || "",
        billingLastName: data.shippingAddress.billingLastName || "",
        billingStreet: data.shippingAddress.billingStreet || "",
        billingCity: data.shippingAddress.billingCity || "",
        billingZipCode: data.shippingAddress.billingZipCode || "",
        billingCompanyName: data.shippingAddress.billingCompanyName || "",
      },
      termsAccepted: data.termsAccepted,
      invoiceType,
      bankDetails: data.bankDetails || "",
      estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    };

    // Create order using the Order model
    const createdOrder = new Order(orderData);
    await createdOrder.save({ session });

    // Clear cart
    cart.items = [];
    await cart.save({ session });

    // Commit transaction
    await session.commitTransaction();

    console.log(
      `✅ Order created successfully: ${createdOrder._id}, Order Number: ${createdOrder.orderNumber}`
    );

    // Send emails (outside transaction)
    try {
      await sendOrderReceivedEmail(createdOrder);
      await sendOrderNotificationToAdmin(createdOrder);
      console.log(`📧 Emails sent for order: ${createdOrder.orderNumber}`);
    } catch (emailError) {
      console.error("⚠️ Email sending failed:", emailError);
      // Don't throw - order was already created successfully
    }

    return createdOrder;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
