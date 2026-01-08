// src/services/checkout/checkout.service.ts
import mongoose, { Types } from "mongoose";
import Cart from "../../modules/Cart/cart.model";
import UserOrder, {
  IOrder as UserOrderInterface,
  DELIVERY_TIME_OPTIONS,
  COLLECTION_TIME_OPTIONS,
  HIRE_OCCASION_OPTIONS,
  IOrderDocument,
} from "../../modules/UserOrder/order.model";
import Product from "../../modules/Product/product.model";
import ApiError from "../../utils/apiError";
import {
  sendOrderConfirmationEmail,
  sendOrderNotificationToAdmin,
  sendOrderReceivedEmail,
} from "./email.service";
import {
  AvailableDatesResponse,
  DateAvailabilityResponse,
} from "../../modules/Checkout/checkout.interface";

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

    // Validate delivery and collection times
    if (data.shippingAddress.deliveryTime) {
      const validDeliveryTimes = DELIVERY_TIME_OPTIONS.map((opt) => opt.value);
      if (
        !validDeliveryTimes.includes(data.shippingAddress.deliveryTime as any)
      ) {
        throw new ApiError("Invalid delivery time selected", 400);
      }
    }

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

    let subtotalAmount = 0;
    const orderItems: Array<{
      product: Types.ObjectId;
      quantity: number;
      price: number;
      name: string;
      startDate?: Date;
      endDate?: Date;
      hireOccasion?: string;
      keepOvernight?: boolean;
    }> = [];

    // Process cart items
    for (const item of cart.items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        throw new ApiError(`Product not found: ${item.product}`, 404);
      }

      if (product.stock < item.quantity) {
        throw new ApiError(
          `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
          400
        );
      }

      // Update stock
      product.stock -= item.quantity;
      await product.save({ session });

      // Add to order items
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

    // Prepare order data for UserOrder model
    const orderData = {
      user: userId,
      items: orderItems,
      subtotalAmount,
      deliveryFee,
      overnightFee,
      totalAmount: subtotalAmount + deliveryFee + overnightFee,
      paymentMethod:
        data.paymentMethod === "online" ? "credit_card" : "cash_on_delivery",
      status: "pending" as const,
      shippingAddress: {
        firstName: data.shippingAddress.firstName,
        lastName: data.shippingAddress.lastName,
        email: data.shippingAddress.email,
        phone: data.shippingAddress.phone,
        street: data.shippingAddress.street,
        apartment: data.shippingAddress.apartment || "",
        city: data.shippingAddress.city,
        state: data.shippingAddress.country,
        zipCode: data.shippingAddress.zipCode,
        country: data.shippingAddress.country,
        location: data.shippingAddress.location || "",
        deliveryTime: data.shippingAddress.deliveryTime || "",
        collectionTime: data.shippingAddress.collectionTime || "",
        hireOccasion: data.shippingAddress.hireOccasion || "",
        keepOvernight: data.shippingAddress.keepOvernight || false,
        notes: data.shippingAddress.notes || "",
        companyName: data.shippingAddress.companyName || "",
        locationAccessibility: data.shippingAddress.locationAccessibility || "",
        floorType: data.shippingAddress.floorType || "",
        userType: data.shippingAddress.userType || "",
        differentBillingAddress:
          data.shippingAddress.differentBillingAddress || false,
        billingFirstName: data.shippingAddress.billingFirstName || "",
        billingLastName: data.shippingAddress.billingLastName || "",
        billingStreet: data.shippingAddress.billingStreet || "",
        billingCity: data.shippingAddress.billingCity || "",
        billingZipCode: data.shippingAddress.billingZipCode || "",
        billingCompanyName: data.shippingAddress.billingCompanyName || "",
      },
      bankDetails: data.bankDetails,
      termsAccepted: data.termsAccepted,
      invoiceType: data.invoiceType || "regular",
      estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    };

    // Create order with type casting
    const [createdOrder] = (await UserOrder.create([orderData], {
      session,
    })) as unknown as IOrderDocument[];

    if (!createdOrder) {
      throw new ApiError("Failed to create order", 500);
    }

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
// Add this function to your existing checkout.service.ts
export const checkCartStock = async (
  userId: Types.ObjectId
): Promise<{
  allInStock: boolean;
  items: Array<{
    productId: Types.ObjectId;
    name: string;
    requested: number;
    available: number;
    inStock: boolean;
  }>;
}> => {
  const cart = await Cart.findOne({ user: userId }).populate("items.product");

  if (!cart || cart.items.length === 0) {
    throw new ApiError("Cart is empty", 400);
  }

  const stockChecks = [];

  for (const item of cart.items) {
    const product = await Product.findById(item.product);

    if (!product) {
      stockChecks.push({
        productId: item.product,
        name: "Product not found",
        requested: item.quantity,
        available: 0,
        inStock: false,
      });
      continue;
    }

    stockChecks.push({
      productId: product._id,
      name: product.name,
      requested: item.quantity,
      available: product.stock,
      inStock: product.stock >= item.quantity,
    });
  }

  return {
    allInStock: stockChecks.every((item) => item.inStock),
    items: stockChecks,
  };
};
// Add to your existing checkout.service.ts
export const checkDateAvailability = async (
  productId: string,
  startDate: Date,
  endDate: Date,
  quantity: number = 1
): Promise<DateAvailabilityResponse> => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  // Check basic availability
  if (!product.active) {
    return {
      isAvailable: false,
      productId: product._id.toString(),
      productName: product.name,
      requestedQuantity: quantity,
      availableQuantity: 0,
      startDate,
      endDate,
      totalDays: Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ),
      message: "Product is not active",
    };
  }

  // Check stock
  if (product.stock < quantity) {
    return {
      isAvailable: false,
      productId: product._id.toString(),
      productName: product.name,
      requestedQuantity: quantity,
      availableQuantity: product.stock,
      startDate,
      endDate,
      totalDays: Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ),
      message: `Insufficient stock. Available: ${product.stock}`,
    };
  }

  // Check date range against product availability dates
  const now = new Date();
  if (startDate < now) {
    return {
      isAvailable: false,
      productId: product._id.toString(),
      productName: product.name,
      requestedQuantity: quantity,
      availableQuantity: product.stock,
      startDate,
      endDate,
      totalDays: Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ),
      message: "Start date cannot be in the past",
    };
  }

  if (startDate < product.availableFrom || endDate > product.availableUntil) {
    return {
      isAvailable: false,
      productId: product._id.toString(),
      productName: product.name,
      requestedQuantity: quantity,
      availableQuantity: product.stock,
      startDate,
      endDate,
      totalDays: Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ),
      message: `Product only available from ${product.availableFrom.toDateString()} to ${product.availableUntil.toDateString()}`,
    };
  }

  // Check for overlapping orders
  const existingOrders = await UserOrder.find({
    "items.product": productId,
    status: { $in: ["pending", "confirmed", "shipped"] },
  });

  let bookedQuantity = 0;

  for (const order of existingOrders) {
    for (const item of order.items) {
      if (item.product.toString() === productId) {
        // Check if dates overlap
        const itemStart = item.startDate || new Date();
        const itemEnd = item.endDate || new Date();

        if (startDate <= itemEnd && endDate >= itemStart) {
          bookedQuantity += item.quantity;
        }
      }
    }
  }

  const finalAvailable = product.stock - bookedQuantity;

  if (finalAvailable < quantity) {
    return {
      isAvailable: false,
      productId: product._id.toString(),
      productName: product.name,
      requestedQuantity: quantity,
      availableQuantity: finalAvailable,
      startDate,
      endDate,
      totalDays: Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ),
      message: `Not enough available during selected dates. Available: ${finalAvailable}`,
    };
  }

  return {
    isAvailable: true,
    productId: product._id.toString(),
    productName: product.name,
    requestedQuantity: quantity,
    availableQuantity: finalAvailable,
    startDate,
    endDate,
    totalDays: Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ),
    message: "Available for booking",
  };
};

export const getAvailableDates = async (
  productId: string,
  startDate?: Date,
  endDate?: Date,
  quantity: number = 1
): Promise<AvailableDatesResponse> => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product ID", 400);
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  // Default to next 30 days
  const start = startDate || new Date();
  const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Get existing orders for this product
  const existingOrders = await UserOrder.find({
    "items.product": productId,
    status: { $in: ["pending", "confirmed", "shipped"] },
  });

  const availableDates: string[] = [];
  const unavailableDates: string[] = [];

  const currentDate = new Date(start);
  const lastDate = new Date(end);

  while (currentDate <= lastDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const date = new Date(dateStr);

    // Check if date is within product availability range
    if (date < product.availableFrom || date > product.availableUntil) {
      unavailableDates.push(dateStr);
    } else {
      // Check for existing bookings on this date
      let bookedOnDate = 0;

      for (const order of existingOrders) {
        for (const item of order.items) {
          if (item.product.toString() === productId) {
            const itemStart = item.startDate || new Date(0);
            const itemEnd = item.endDate || new Date(0);

            if (date >= itemStart && date <= itemEnd) {
              bookedOnDate += item.quantity;
            }
          }
        }
      }

      if (product.stock - bookedOnDate >= quantity) {
        availableDates.push(dateStr);
      } else {
        unavailableDates.push(dateStr);
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    productId: product._id.toString(),
    productName: product.name,
    availableDates,
    unavailableDates,
    range: {
      start: start,
      end: end,
    },
  };
};
