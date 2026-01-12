import mongoose, { Types } from "mongoose";
import Cart from "../../modules/Cart/cart.model";
import Order from "../../modules/Order/order.model";
import {
  IOrderDocument,
  IShippingAddress,
} from "../../modules/Order/order.interface";
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
  DeliveryTimeManager,
} from "../../modules/Order/order.interface";
import { PromoService } from "../../modules/promos/promos.service";

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
  promoCode?: string;
}

export interface DateAvailabilityResponse {
  isAvailable: boolean;
  productId: string;
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  message?: string;
}

// ==================== STOCK CHECK ====================
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
  summary?: {
    totalItems: number;
    inStock: number;
    outOfStock: number;
  };
}> => {
  const cart = await Cart.findOne({ user: userId }).populate("items.product");

  if (!cart || cart.items.length === 0) {
    return {
      allInStock: false,
      items: [],
      summary: {
        totalItems: 0,
        inStock: 0,
        outOfStock: 0,
      },
    };
  }

  const stockItems = [];
  let inStockCount = 0;
  let outOfStockCount = 0;

  for (const item of cart.items) {
    const product = await Product.findById(item.product);

    if (!product) {
      stockItems.push({
        productId: item.product,
        name: "Unknown Product",
        requested: item.quantity,
        available: 0,
        inStock: false,
      });
      outOfStockCount++;
      continue;
    }

    const inStock = product.stock >= item.quantity;

    stockItems.push({
      productId: product._id,
      name: product.name,
      requested: item.quantity,
      available: product.stock,
      inStock,
    });

    if (inStock) {
      inStockCount++;
    } else {
      outOfStockCount++;
    }
  }

  return {
    allInStock: outOfStockCount === 0,
    items: stockItems,
    summary: {
      totalItems: cart.items.length,
      inStock: inStockCount,
      outOfStock: outOfStockCount,
    },
  };
};

// ==================== DATE AVAILABILITY ====================
export const checkDateAvailability = async (
  productId: Types.ObjectId,
  startDate: Date,
  endDate: Date,
  quantity: number = 1
): Promise<DateAvailabilityResponse> => {
  // Validate dates
  if (startDate >= endDate) {
    throw new ApiError("Start date must be before end date", 400);
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  // Calculate total days
  const totalDays =
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  // Find overlapping orders
  const overlappingOrders = await Order.find({
    "items.product": productId,
    status: { $nin: ["cancelled", "refunded"] },
    $or: [
      {
        "items.startDate": { $lte: endDate },
        "items.endDate": { $gte: startDate },
      },
    ],
  });

  // Calculate maximum booked quantity for the date range
  const bookedQuantities = new Map<string, number>();

  // Initialize all dates in range with 0 bookings
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split("T")[0];
    bookedQuantities.set(dateKey, 0);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Calculate bookings for each date
  overlappingOrders.forEach((order) => {
    order.items.forEach((item: any) => {
      if (
        item.product.toString() === productId.toString() &&
        item.startDate &&
        item.endDate
      ) {
        const itemStart = new Date(item.startDate);
        const itemEnd = new Date(item.endDate);

        const checkDate = new Date(itemStart);
        while (checkDate <= itemEnd) {
          const dateKey = checkDate.toISOString().split("T")[0];
          if (bookedQuantities.has(dateKey)) {
            const currentBooked = bookedQuantities.get(dateKey) || 0;
            bookedQuantities.set(dateKey, currentBooked + item.quantity);
          }
          checkDate.setDate(checkDate.getDate() + 1);
        }
      }
    });
  });

  // Check if all dates have enough stock
  let isAvailable = true;
  let maxBooked = 0;

  for (const [_, booked] of bookedQuantities) {
    if (booked > maxBooked) {
      maxBooked = booked;
    }
    if (product.stock - booked < quantity) {
      isAvailable = false;
      break;
    }
  }

  return {
    isAvailable,
    productId: productId.toString(),
    productName: product.name,
    requestedQuantity: quantity,
    availableQuantity: product.stock - maxBooked,
    startDate,
    endDate,
    totalDays,
    message: isAvailable
      ? `Available for booking`
      : `Only ${product.stock - maxBooked} available on some dates`,
  };
};

// ==================== GET AVAILABLE DATES ====================
export const getAvailableDates = async (
  productId: Types.ObjectId,
  startDate?: Date,
  endDate?: Date,
  quantity: number = 1
): Promise<{
  productId: string;
  productName: string;
  availableDates: string[];
  unavailableDates: string[];
  range: {
    start: Date;
    end: Date;
  };
}> => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError("Product not found", 404);
  }

  // Set default date range (next 30 days)
  const defaultStart = startDate || new Date();
  const defaultEnd = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Adjust to start from tomorrow if no start date provided
  if (!startDate) {
    defaultStart.setDate(defaultStart.getDate() + 1);
    defaultStart.setHours(0, 0, 0, 0);
  }
  defaultEnd.setHours(23, 59, 59, 999);

  // Find overlapping orders
  const overlappingOrders = await Order.find({
    "items.product": productId,
    status: { $nin: ["cancelled", "refunded"] },
    $or: [
      {
        "items.startDate": { $lte: defaultEnd },
        "items.endDate": { $gte: defaultStart },
      },
    ],
  });

  // Calculate booked quantities per date
  const bookedQuantities = new Map<string, number>();

  // Initialize all dates with 0 bookings
  const currentDate = new Date(defaultStart);
  while (currentDate <= defaultEnd) {
    const dateKey = currentDate.toISOString().split("T")[0];
    bookedQuantities.set(dateKey, 0);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Fill in actual bookings
  overlappingOrders.forEach((order) => {
    order.items.forEach((item: any) => {
      if (
        item.product.toString() === productId.toString() &&
        item.startDate &&
        item.endDate
      ) {
        const itemStart = new Date(item.startDate);
        const itemEnd = new Date(item.endDate);

        const checkDate = new Date(itemStart);
        while (checkDate <= itemEnd) {
          const dateKey = checkDate.toISOString().split("T")[0];
          if (bookedQuantities.has(dateKey)) {
            const currentBooked = bookedQuantities.get(dateKey) || 0;
            bookedQuantities.set(dateKey, currentBooked + item.quantity);
          }
          checkDate.setDate(checkDate.getDate() + 1);
        }
      }
    });
  });

  // Determine available and unavailable dates
  const availableDates: string[] = [];
  const unavailableDates: string[] = [];

  bookedQuantities.forEach((booked, dateKey) => {
    if (product.stock - booked >= quantity) {
      availableDates.push(dateKey);
    } else {
      unavailableDates.push(dateKey);
    }
  });

  return {
    productId: productId.toString(),
    productName: product.name,
    availableDates,
    unavailableDates,
    range: {
      start: defaultStart,
      end: defaultEnd,
    },
  };
};

// ==================== PROMO CODE APPLICATION ====================
const applyPromoCode = async (
  promoCode: string,
  orderAmount: number,
  userId: string
): Promise<{ discount: number; promoId: string; promoName: string }> => {
  const promoService = new PromoService();

  // Get promo by name
  const promo = await promoService.getPromoByName(promoCode);
  if (!promo) {
    throw new ApiError("Invalid promo code", 400);
  }

  // Validate promo
  const validation = await promoService.validatePromo(promoCode, orderAmount);
  if (!validation.valid) {
    throw new ApiError(validation.message || "Promo code is not valid", 400);
  }

  // Apply promo
  const applyResult = await promoService.applyPromo(
    (promo._id as string).toString(),
    orderAmount,
    userId
  );

  if (!applyResult.success) {
    throw new ApiError(
      applyResult.message || "Failed to apply promo code",
      400
    );
  }

  return {
    discount: applyResult.discount,
    promoId: (promo._id as string).toString(),
    promoName: promo.promoName,
  };
};

// ==================== CREATE ORDER ====================
export const createOrderFromCart = async (
  userId: Types.ObjectId,
  data: CreateOrderData
): Promise<IOrderDocument> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Find cart
    const cart = await Cart.findOne({ user: userId })
      .populate("items.product")
      .session(session);
    if (!cart || cart.items.length === 0) {
      throw new ApiError("Cart is empty", 400);
    }

    // Validate shipping address
    if (!data.shippingAddress) {
      throw new ApiError("Shipping address is required", 400);
    }

    const requiredFields: Array<keyof IShippingAddress> = [
      "firstName",
      "lastName",
      "phone",
      "email",
      "street",
      "city",
      "zipCode",
    ];

    for (const field of requiredFields) {
      const value = data.shippingAddress[field];

      if (typeof value !== "string" || value.trim() === "") {
        const fieldName = field.replace(/([A-Z])/g, " $1").toLowerCase();
        throw new ApiError(`${fieldName} is required`, 400);
      }
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.shippingAddress.email)) {
      throw new ApiError("Invalid email format", 400);
    }

    // Validate phone
    const phoneDigits = data.shippingAddress.phone.replace(/\D/g, "");
    if (phoneDigits.length < 8) {
      throw new ApiError("Phone number must be at least 8 digits", 400);
    }

    // Validate terms
    if (!data.termsAccepted) {
      throw new ApiError("You must accept terms & conditions", 400);
    }

    // Validate corporate invoice
    if (
      data.invoiceType === "corporate" &&
      (!data.bankDetails || !data.bankDetails.trim())
    ) {
      throw new ApiError(
        "Bank details are required for corporate invoices",
        400
      );
    }

    // Validate delivery time
    if (data.shippingAddress.deliveryTime) {
      const normalizedDeliveryTime = DeliveryTimeManager.normalizeForDatabase(
        data.shippingAddress.deliveryTime
      );
      if (!DeliveryTimeManager.isValid(normalizedDeliveryTime)) {
        throw new ApiError("Invalid delivery time selected", 400);
      }
      data.shippingAddress.deliveryTime = normalizedDeliveryTime;
    }

    // Validate hire occasion
    if (
      data.shippingAddress.hireOccasion &&
      !HIRE_OCCASION_OPTIONS.includes(data.shippingAddress.hireOccasion as any)
    ) {
      throw new ApiError("Invalid hire occasion", 400);
    }

    // Check stock availability
    const stockCheck = await checkCartStock(userId);
    if (!stockCheck.allInStock) {
      const outOfStockItems = stockCheck.items.filter((item) => !item.inStock);
      throw new ApiError(
        `Insufficient stock for: ${outOfStockItems
          .map(
            (item) =>
              `${item.name} (available: ${item.available}, requested: ${item.requested})`
          )
          .join(", ")}`,
        400
      );
    }

    // Check date availability for items with dates
    for (const item of cart.items) {
      if (item.startDate && item.endDate) {
        const availability = await checkDateAvailability(
          item.product,
          new Date(item.startDate),
          new Date(item.endDate),
          item.quantity
        );

        if (!availability.isAvailable) {
          throw new ApiError(
            `Date not available for ${item.name}: ${availability.message}`,
            400
          );
        }
      }
    }

    // Process cart items
    let subtotalAmount = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        throw new ApiError(`Product not found: ${item.name}`, 404);
      }

      // Verify stock again (in case of race condition)
      if (product.stock < item.quantity) {
        throw new ApiError(
          `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
          400
        );
      }

      // Update product stock
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
      deliveryFee = DeliveryTimeManager.getFee(
        data.shippingAddress.deliveryTime
      );
    }

    // Calculate collection fee
    if (
      data.shippingAddress.collectionTime &&
      data.shippingAddress.collectionTime.trim() !== ""
    ) {
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

    // Calculate initial total
    const initialTotal = subtotalAmount + deliveryFee + overnightFee;

    // Apply promo code if provided
    let discountAmount = 0;
    let promoCode = "";
    let promoDiscount = 0;
    let promoName = "";

    if (data.promoCode) {
      try {
        const promoResult = await applyPromoCode(
          data.promoCode,
          initialTotal,
          userId.toString()
        );
        discountAmount = promoResult.discount;
        promoCode = data.promoCode;
        promoDiscount = promoResult.discount;
        promoName = promoResult.promoName;
      } catch (promoError: any) {
        throw new ApiError(promoError.message, 400);
      }
    }

    // Calculate final total
    const totalAmount = initialTotal - discountAmount;

    // Map payment method
    const paymentMethod =
      data.paymentMethod === "online"
        ? PAYMENT_METHODS.ONLINE
        : PAYMENT_METHODS.CASH_ON_DELIVERY;

    // Map invoice type
    const invoiceType =
      data.invoiceType === "corporate"
        ? INVOICE_TYPES.CORPORATE
        : INVOICE_TYPES.REGULAR;

    // Prepare order data
    const orderData = {
      user: userId,
      items: orderItems,
      subtotalAmount,
      deliveryFee,
      overnightFee,
      discountAmount,
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
        deliveryTime: data.shippingAddress.deliveryTime || "8am-12pm",
        collectionTime: data.shippingAddress.collectionTime || "",
        floorType: data.shippingAddress.floorType || "",
        userType: data.shippingAddress.userType || "",
        keepOvernight: data.shippingAddress.keepOvernight || false,
        hireOccasion:
          data.shippingAddress.hireOccasion || HIRE_OCCASION_OPTIONS[0],
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
      promoCode: promoCode || undefined,
      promoDiscount,
      estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    };

    // Create order
    const createdOrder = new Order(orderData);
    await createdOrder.save({ session });

    // Clear cart
    cart.items = [];
    await cart.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log(
      `✅ Order created: ${createdOrder._id}, Order Number: ${createdOrder.orderNumber}`
    );

    // Send emails
    try {
      await sendOrderReceivedEmail(createdOrder);
      await sendOrderNotificationToAdmin(createdOrder);
      console.log(`📧 Emails sent for order: ${createdOrder.orderNumber}`);
    } catch (emailError) {
      console.error("⚠️ Email sending failed:", emailError);
      // Don't throw error - order was created successfully
    }

    return createdOrder;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
