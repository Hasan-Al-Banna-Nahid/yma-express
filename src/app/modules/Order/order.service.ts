// src/modules/order/order.service.ts
import mongoose from "mongoose";
import Order from "./order.model";
import Customer from "../customer/customer.model";
import User from "../Auth/user.model";
import Product from "../Product/product.model";
import ApiError from "../../utils/apiError";
import {
  IOrderDocument,
  CreateOrderInput,
  UpdateOrderInput,
  OrderStats,
  FilterOptions,
  ORDER_STATUS,
  DeliveryTimeManager,
  IShippingAddress,
} from "./order.interface";
import {
  sendOrderReceivedEmail,
  sendOrderConfirmedEmail,
  sendDeliveryReminderEmail,
  sendOrderCancelledEmail,
  sendInvoiceEmail,
  notifyAdminNewOrder,
  sendDeliveryCompleteEmail,
} from "./email.service";

// ───────────────────────────────────────────────
// REVENUE HELPER – only delivered orders + deliveryDate
// ───────────────────────────────────────────────
export const getRevenueInPeriod = async (
  start: Date,
  end: Date,
): Promise<number> => {
  const result = await Order.aggregate([
    {
      $match: {
        status: ORDER_STATUS.DELIVERED,
        deliveryDate: { $gte: start, $lt: end },
      },
    },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  return result[0]?.total ?? 0;
};

// ───────────────────────────────────────────────
// ORDER CREATION
// ───────────────────────────────────────────────
export const createOrder = async (
  userId: string,
  orderData: Partial<CreateOrderInput> & { items: any[] },
): Promise<IOrderDocument> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      items,
      shippingAddress,
      paymentMethod,
      invoiceType = "regular",
      bankDetails = "",
      termsAccepted = false,
      promoCode,
      promoDiscount = 0,
      estimatedDeliveryDate,
    } = orderData;

    if (!items?.length)
      throw new ApiError("Order must contain at least one item", 400);
    if (!termsAccepted)
      throw new ApiError("You must accept the terms and conditions", 400);

    let subtotalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      if (!item.product)
        throw new ApiError("Product ID is required for each item", 400);

      const product = await Product.findById(item.product).session(session);
      if (!product)
        throw new ApiError(`Product ${item.product} not found`, 404);

      if (product.stock < item.quantity) {
        throw new ApiError(
          `Insufficient stock for ${product.name}. Available: ${product.stock}`,
          400,
        );
      }

      product.stock -= item.quantity;
      await product.save({ session });

      const itemTotal = product.price * item.quantity;
      subtotalAmount += itemTotal;

      processedItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        startDate: item.startDate ? new Date(item.startDate) : undefined,
        endDate: item.endDate ? new Date(item.endDate) : undefined,
        hireOccasion: item.hireOccasion,
        keepOvernight: !!item.keepOvernight,
      });
    }

    const user = await User.findById(userId).session(session);
    if (!user) throw new ApiError("User not found", 404);

    // Delivery & Collection Fees
    const deliveryTimeRaw = shippingAddress?.deliveryTime;
    const normalizedDeliveryTime = deliveryTimeRaw
      ? DeliveryTimeManager.normalize(deliveryTimeRaw, "delivery")
      : "09:00";

    const deliveryFee = DeliveryTimeManager.getDeliveryFee(
      normalizedDeliveryTime,
    );

    let collectionFee = 0;
    const collectionTimeRaw = shippingAddress?.collectionTime;
    if (collectionTimeRaw?.trim()) {
      const normalizedCollectionTime = DeliveryTimeManager.normalize(
        collectionTimeRaw,
        "collection",
      );
      collectionFee = DeliveryTimeManager.getCollectionFee(
        normalizedCollectionTime,
      );
    }

    const totalDeliveryFee = deliveryFee + collectionFee;

    const overnightFee = processedItems.reduce(
      (sum, item) => sum + (item.keepOvernight ? 50 : 0),
      0,
    );

    const discountAmount = promoDiscount || 0;
    const totalAmount =
      subtotalAmount + totalDeliveryFee + overnightFee - discountAmount;

    const finalShippingAddress: IShippingAddress = {
      firstName: shippingAddress?.firstName || "",
      lastName: shippingAddress?.lastName || "",
      phone: shippingAddress?.phone || user.phone || "",
      email: shippingAddress?.email || user.email || "",
      country: shippingAddress?.country || "UK",
      city: shippingAddress?.city || "",
      street: shippingAddress?.street || "",
      zipCode: shippingAddress?.zipCode || "",
      apartment: shippingAddress?.apartment || "",
      location: shippingAddress?.location || "",
      companyName: shippingAddress?.companyName || "",
      locationAccessibility: shippingAddress?.locationAccessibility || "",
      deliveryTime: normalizedDeliveryTime,
      collectionTime: collectionTimeRaw
        ? DeliveryTimeManager.normalize(collectionTimeRaw, "collection")
        : undefined,
      floorType: shippingAddress?.floorType || "",
      userType: shippingAddress?.userType || "residential",
      keepOvernight: overnightFee > 0,
      hireOccasion: shippingAddress?.hireOccasion || "birthday",
      notes: shippingAddress?.notes || "",
      differentBillingAddress: !!shippingAddress?.differentBillingAddress,
      billingFirstName: shippingAddress?.billingFirstName || "",
      billingLastName: shippingAddress?.billingLastName || "",
      billingStreet: shippingAddress?.billingStreet || "",
      billingCity: shippingAddress?.billingCity || "",
      billingZipCode: shippingAddress?.billingZipCode || "",
      billingCompanyName: shippingAddress?.billingCompanyName || "",
    };

    const order = new Order({
      user: userId,
      items: processedItems,
      subtotalAmount,
      deliveryFee: totalDeliveryFee,
      overnightFee,
      discountAmount,
      totalAmount,
      paymentMethod,
      status: "pending",
      shippingAddress: finalShippingAddress,
      termsAccepted: !!termsAccepted,
      invoiceType,
      bankDetails,
      promoCode,
      promoDiscount: discountAmount,
      estimatedDeliveryDate: estimatedDeliveryDate
        ? new Date(estimatedDeliveryDate)
        : new Date(Date.now() + 2 * 86400000),
    });

    await order.save({ session });

    await createOrUpdateCustomerFromOrder(
      userId,
      user,
      order,
      finalShippingAddress,
      session,
    );

    await session.commitTransaction();

    Promise.allSettled([
      sendOrderReceivedEmail(order),
      notifyAdminNewOrder(order),
    ]).catch((err) => console.error("Email notification failed:", err));

    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const createOrUpdateCustomerFromOrder = async (
  userId: string,
  user: any,
  order: any,
  shippingAddress: any,
  session: mongoose.ClientSession,
): Promise<void> => {
  let customer = await Customer.findOne({ user: userId }).session(session);

  const customerData = {
    user: userId,
    name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
    email: shippingAddress.email,
    phone: shippingAddress.phone || user.phone || "",
    address: shippingAddress.street || "",
    city: shippingAddress.city || "",
    postcode: shippingAddress.zipCode || "",
    country: shippingAddress.country || "UK",
    notes: shippingAddress.notes || "",
    customerType: "retail",
  };

  if (customer) {
    customer.totalOrders += 1;
    customer.totalSpent += order.totalAmount || 0;
    customer.lastOrderDate = new Date();
    if (!customer.firstOrderDate) customer.firstOrderDate = new Date();

    if (!customer.phone && customerData.phone)
      customer.phone = customerData.phone;
    if (!customer.address && customerData.address)
      customer.address = customerData.address;
    if (!customer.city && customerData.city) customer.city = customerData.city;
    if (!customer.postcode && customerData.postcode)
      customer.postcode = customerData.postcode;

    await customer.save({ session });
  } else {
    customer = new Customer({
      ...customerData,
      totalOrders: 1,
      totalSpent: order.totalAmount || 0,
      firstOrderDate: new Date(),
      lastOrderDate: new Date(),
      isFavorite: false,
      tags: ["new-customer"],
      customerId: `CUST${Date.now().toString().slice(-6)}`,
    });
    await customer.save({ session });
  }

  await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        phone: shippingAddress.phone || user.phone,
        address: shippingAddress.street || user.address,
        city: shippingAddress.city || user.city,
        postcode: shippingAddress.zipCode || user.postcode,
      },
    },
    { session },
  );
};

// ───────────────────────────────────────────────
// GET ORDER BY ID
// ───────────────────────────────────────────────
export const getOrderById = async (
  orderId: string,
): Promise<IOrderDocument> => {
  if (!orderId || typeof orderId !== "string")
    throw new ApiError("Order ID is required", 400);

  let order: IOrderDocument | null = null;

  if (mongoose.Types.ObjectId.isValid(orderId) && orderId.length === 24) {
    order = await Order.findById(orderId)
      .populate("user", "name email phone address city postcode")
      .populate("items.product", "name imageCover price category description");
  }

  if (!order) {
    order = await Order.findOne({ orderNumber: orderId })
      .populate("user", "name email phone address city postcode")
      .populate("items.product", "name imageCover price category description");
  }

  if (!order) throw new ApiError("Order not found", 404);
  return order;
};

export const deleteOrder = async (
  orderId: string,
  userId?: string,
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  if (userId && order.user.toString() !== userId.toString()) {
    throw new ApiError("You are not authorized to delete this order", 403);
  }

  if (
    ![ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED].includes(
      order.status as any,
    )
  ) {
    throw new ApiError(
      "Cannot delete confirmed, shipped, or delivered orders",
      400,
    );
  }

  await order.deleteOne();
};

// ───────────────────────────────────────────────
// GET ALL ORDERS (ADMIN) - with filters & pagination
// ───────────────────────────────────────────────
// ───────────────────────────────────────────────
// GET ALL ORDERS (ADMIN) - with filters & pagination
// ───────────────────────────────────────────────
// ───────────────────────────────────────────────
// GET ALL ORDERS (ADMIN) - with filters & pagination
// ───────────────────────────────────────────────
export const getAllOrders = async (
  page: number = 1,
  limit: number = 20,
  filters: any = {},
): Promise<{
  orders: IOrderDocument[];
  total: number;
  pages: number;
  currentPage: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}> => {
  try {
    const skip = (page - 1) * limit;
    const query: any = {};

    // ১. স্ট্যাটাস ফিল্টার
    if (filters.status && filters.status !== "all") {
      query.status = filters.status;
    }

    // ──────────────────────────────────────────────────────────────
    // ২. SPECIFIC DATE FILTER (Range Overlap Logic)
    // ক্লায়েন্ট যদি একটি নির্দিষ্ট দিন (selectedDate) সিলেক্ট করেন
    // ──────────────────────────────────────────────────────────────
    // Query Logic: estimatedDeliveryDate ফিল্ড ব্যবহার করে
    if (filters.selectedDates) {
      // ১. ফ্রন্টএন্ড থেকে আসা 'selectedDates' কে ডেট অবজেক্টে রূপান্তর
      const targetDate = new Date(filters.selectedDates as string);

      // ২. ওই নির্দিষ্ট দিনের শুরু (00:00:00) এবং শেষ (23:59:59) সেট করা
      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // ৩. সরাসরি DB-র estimatedDeliveryDate ফিল্ডে কুয়েরি করা
      query.estimatedDeliveryDate = {
        $gte: startOfDay,
        $lte: endOfDay,
      };

      console.log(
        "Applied Filter on estimatedDeliveryDate for:",
        filters.selectedDates,
      );
    }

    // ৩. অন্যান্য ফিল্টার (Search, User, Amount ইত্যাদি)
    if (filters.search && filters.search.trim()) {
      const searchRegex = new RegExp(filters.search.trim(), "i");
      query.$or = [
        { orderNumber: searchRegex },
        { "shippingAddress.firstName": searchRegex },
        { "shippingAddress.phone": searchRegex },
      ];
    }

    // ৪. পেমেন্ট মেথড ফিল্টার
    if (filters.paymentMethod && filters.paymentMethod !== "all") {
      query.paymentMethod = filters.paymentMethod;
    }

    // ৫. ডেটা ফেচিং এবং সর্টিং
    const total = await Order.countDocuments(query);
    const pages = Math.ceil(total / limit);

    const orders = await Order.find(query)
      .populate({ path: "user", select: "name email phone", model: User })
      .populate({
        path: "items.product",
        select: "name imageCover price",
        model: Product,
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // ৬. ডাটা হাইড্রেশন (প্রোডাক্ট না থাকলে ব্যাকআপ নাম দেওয়া)
    const hydratedOrders = (orders || []).map((order: any) => {
      if (!Array.isArray(order.items)) return order;
      order.items = order.items.map((item: any) => ({
        ...item,
        product: item.product || {
          name: item.name || "Unknown Item",
          imageCover: item.imageCover,
        },
      }));
      return order;
    });

    return {
      orders: hydratedOrders as unknown as IOrderDocument[],
      total,
      pages,
      currentPage: page,
      limit,
      hasNextPage: page < pages,
      hasPrevPage: page > 1,
    };
  } catch (error: any) {
    console.error("Error in getAllOrders:", error.message);
    throw error;
  }
};

// ───────────────────────────────────────────────
// UPDATE ORDER (USER & ADMIN)
// ───────────────────────────────────────────────
export const updateOrder = async (
  orderId: string,
  updateData: UpdateOrderInput,
): Promise<IOrderDocument> => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError("Invalid order ID", 400);
  }

  // 1. Fetch existing order
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  const previousStatus = order.status;

  // 2. Handle Shipping Address Updates & Normalize Times
  if (updateData.shippingAddress) {
    const existingAddr = order.shippingAddress
      ? order.shippingAddress.toObject()
      : {};
    const newAddr = updateData.shippingAddress;

    // Normalize times if provided
    if (newAddr.deliveryTime) {
      newAddr.deliveryTime = DeliveryTimeManager.normalize(
        newAddr.deliveryTime,
        "delivery",
      );
    }
    if (newAddr.collectionTime) {
      newAddr.collectionTime = DeliveryTimeManager.normalize(
        newAddr.collectionTime,
        "collection",
      );
    }

    // Merge address
    order.shippingAddress = {
      ...existingAddr,
      ...newAddr,
    } as any; // Type cast to satisfy strict partial matches
  }

  // 2.1 Handle keepOvernight toggle even when items are not re-sent
  if (
    typeof updateData.shippingAddress?.keepOvernight === "boolean" &&
    (!updateData.items || updateData.items.length === 0)
  ) {
    const shouldKeepOvernight = updateData.shippingAddress.keepOvernight;
    order.items = (order.items || []).map((item: any) => ({
      ...item,
      keepOvernight: shouldKeepOvernight,
    })) as any;

    // Recalculate overnight fee based on current items
    const overnightCount = (order.items || []).filter(
      (item: any) => item.keepOvernight,
    ).length;
    order.overnightFee = overnightCount * 50;

    // Recalculate total (subtotal + delivery + overnight - discount)
    order.totalAmount =
      (order.subtotalAmount || 0) +
      (order.deliveryFee || 0) +
      (order.overnightFee || 0) -
      (order.discountAmount || 0);
  }

  // 3. Handle ITEMS & PRICE Recalculation
  // We check length. We cast to 'any[]' to fix the TS errors regarding missing properties like keepOvernight
  if (updateData.items && updateData.items.length > 0) {
    let newSubtotal = 0;
    let newOvernightFee = 0;
    const processedItems = [];

    // FIX: Cast items to any[] to allow access to optional fields (startDate, keepOvernight, etc.)
    const itemsInput = updateData.items as any[];

    for (const item of itemsInput) {
      // Logic: If item.product is an object, use ._id, otherwise use item.product directly
      const productId = item.product?._id || item.product || item._id;

      if (!productId) continue; // Skip invalid items

      // Fetch current product details from DB for accurate pricing
      const product = await Product.findById(productId);

      // Use DB price if available, otherwise fallback to input price
      const price = product ? product.price : item.price || 0;
      const name = product ? product.name : item.name || "Unknown Item";

      const itemTotal = price * item.quantity;
      newSubtotal += itemTotal;

      // Handle Overnight Fee
      if (item.keepOvernight) {
        newOvernightFee += 50; // Standard fee
      }

      processedItems.push({
        product: productId,
        name: name,
        quantity: item.quantity,
        price: price,
        // Safely parse dates
        startDate: item.startDate ? new Date(item.startDate) : undefined,
        endDate: item.endDate ? new Date(item.endDate) : undefined,
        hireOccasion: item.hireOccasion || "",
        keepOvernight: !!item.keepOvernight,
      });
    }

    // Update Order Items and Fees
    order.items = processedItems as any;
    order.subtotalAmount = newSubtotal;
    order.overnightFee = newOvernightFee;

    // Recalculate Delivery Fee based on address
    const deliveryTime = order.shippingAddress?.deliveryTime || "09:00";
    const deliveryFee = DeliveryTimeManager.getDeliveryFee(deliveryTime);

    let collectionFee = 0;
    if (order.shippingAddress?.collectionTime) {
      collectionFee = DeliveryTimeManager.getCollectionFee(
        order.shippingAddress.collectionTime,
      );
    }

    order.deliveryFee = deliveryFee + collectionFee;

    // Recalculate Total: Subtotal + Delivery + Overnight - Discount
    order.totalAmount =
      order.subtotalAmount +
      order.deliveryFee +
      order.overnightFee -
      (order.discountAmount || 0);
  }

  // 4. Update Status (Explicitly)
  if (updateData.status && updateData.status !== previousStatus) {
    order.status = updateData.status;

    // Auto-set delivery date if moving to Delivered
    if (updateData.status === ORDER_STATUS.DELIVERED && !order.deliveryDate) {
      order.deliveryDate = new Date();
    }
  }

  // 5. Update other top-level fields
  // Exclude fields we already handled manually to prevent overwriting
  const excludedFields = [
    "items",
    "shippingAddress",
    "status",
    "subtotalAmount",
    "totalAmount",
    "deliveryFee",
    "overnightFee",
  ];

  Object.entries(updateData).forEach(([key, value]) => {
    if (value !== undefined && !excludedFields.includes(key)) {
      (order as any)[key] = value;
    }
  });

  // 6. Save the Order
  await order.save();

  // 7. Send Emails (Admin Logic) - Non-blocking
  if (updateData.status && updateData.status !== previousStatus) {
    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone")
      .populate("items.product", "name imageCover price");

    if (populatedOrder) {
      try {
        switch (updateData.status) {
          case ORDER_STATUS.CONFIRMED:
            await sendOrderConfirmedEmail(populatedOrder);
            break;
          case ORDER_STATUS.SHIPPED:
            await sendDeliveryReminderEmail(populatedOrder);
            break;
          case ORDER_STATUS.CANCELLED:
            await sendOrderCancelledEmail(populatedOrder);
            break;
          case ORDER_STATUS.DELIVERED:
            await sendDeliveryCompleteEmail(populatedOrder);
            break;
        }
      } catch (emailErr) {
        console.error("Failed to send status update email:", emailErr);
      }
    }
  }

  return order;
};

// ───────────────────────────────────────────────
// UPDATE ORDER STATUS (ADMIN - with deliveryDate auto-set)
// ───────────────────────────────────────────────
export const updateOrderStatus = async (
  orderId: string,
  status: string,
  adminNotes?: string,
): Promise<IOrderDocument> => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError("Order not found", 404);

  const previousStatus = order.status;

  order.status = status;
  if (adminNotes) order.adminNotes = adminNotes;

  // ───────────────────────────────────────────────
  // Automatically set real delivery date when marked "delivered"
  // ───────────────────────────────────────────────
  if (status === ORDER_STATUS.DELIVERED) {
    // Only set if not already set (prevents overwriting real date)
    if (!order.deliveryDate) {
      order.deliveryDate = new Date(); // ← current real date & time
      console.log(
        `[AUTO] Set deliveryDate for order ${orderId} to ${order.deliveryDate.toISOString()}`,
      );
    }
  }

  await order.save();

  // Email notifications...
  if (status !== previousStatus) {
    const populated = await Order.findById(orderId)
      .populate("user", "name email phone")
      .populate("items.product", "name price");

    if (populated) {
      try {
        switch (status) {
          case ORDER_STATUS.CONFIRMED:
            await sendOrderConfirmedEmail(populated);
            break;
          case ORDER_STATUS.SHIPPED:
            await sendDeliveryReminderEmail(populated);
            break;
          case ORDER_STATUS.DELIVERED:
            await sendDeliveryCompleteEmail(populated);
            break;
          case ORDER_STATUS.CANCELLED:
            await sendOrderCancelledEmail(populated);
            break;
        }
      } catch (err) {
        console.error("Status change email failed:", err);
      }
    }
  }

  return order;
};

// ───────────────────────────────────────────────
// DASHBOARD & STATISTICS
// ───────────────────────────────────────────────
export const getDashboardStats = async () => {
  const now = new Date();

  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(startToday);
  endToday.setDate(startToday.getDate() + 1);

  const startWeek = new Date(startToday);
  const dayOfWeek = startToday.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startWeek.setDate(startToday.getDate() + diff);

  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    todayRevenue,
    thisWeekRevenue,
    thisMonthRevenue,
    pendingConfirmations,
    todayBookingsCount,
    todayDeliveriesCount,
  ] = await Promise.all([
    getRevenueInPeriod(startToday, endToday),
    getRevenueInPeriod(startWeek, endToday),
    getRevenueInPeriod(startMonth, endToday),
    Order.countDocuments({ status: ORDER_STATUS.PENDING }),
    Order.countDocuments({ createdAt: { $gte: startToday, $lt: endToday } }),
    Order.countDocuments({
      status: ORDER_STATUS.DELIVERED,
      deliveryDate: { $gte: startToday, $lt: endToday },
    }),
  ]);

  return {
    todayRevenue: todayRevenue ?? 0,
    thisWeekRevenue: thisWeekRevenue ?? 0,
    thisMonthRevenue: thisMonthRevenue ?? 0,
    pendingConfirmations: pendingConfirmations ?? 0,
    todayBookings: todayBookingsCount ?? 0,
    todayDeliveries: todayDeliveriesCount ?? 0,
  };
};

export const getOrderStatistics = async (): Promise<OrderStats> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  lastOfMonth.setHours(23, 59, 59, 999);

  const [
    totalOrders,
    pendingOrders,
    confirmedOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    lifetimeRev,
    todayRev,
    monthRev,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: ORDER_STATUS.PENDING }),
    Order.countDocuments({ status: ORDER_STATUS.CONFIRMED }),
    Order.countDocuments({ status: ORDER_STATUS.SHIPPED }),
    Order.countDocuments({ status: ORDER_STATUS.DELIVERED }),
    Order.countDocuments({ status: ORDER_STATUS.CANCELLED }),

    Order.aggregate([
      { $match: { status: ORDER_STATUS.DELIVERED } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.aggregate([
      {
        $match: {
          status: ORDER_STATUS.DELIVERED,
          deliveryDate: { $gte: today, $lt: tomorrow },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.aggregate([
      {
        $match: {
          status: ORDER_STATUS.DELIVERED,
          deliveryDate: { $gte: firstOfMonth, $lte: lastOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
  ]);

  const totalRevenue = lifetimeRev[0]?.total ?? 0;
  const todayRevenue = todayRev[0]?.total ?? 0;
  const monthlyRevenue = monthRev[0]?.total ?? 0;
  const averageOrderValue =
    deliveredOrders > 0 ? totalRevenue / deliveredOrders : 0;

  return {
    totalOrders: totalOrders ?? 0,
    pendingOrders: pendingOrders ?? 0,
    confirmedOrders: confirmedOrders ?? 0,
    shippedOrders: shippedOrders ?? 0,
    deliveredOrders: deliveredOrders ?? 0,
    cancelledOrders: cancelledOrders ?? 0,
    totalRevenue,
    todayRevenue,
    monthlyRevenue,
    averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
  };
};

export const getRevenueOverTime = async (
  startDate: Date,
  endDate: Date,
  status: string,
  interval: "day" | "week" | "month" = "day",
): Promise<Array<{ date: string; revenue: number; orders: number }>> => {
  const formats = {
    day: "%Y-%m-%d",
    week: "%Y-%W",
    month: "%Y-%m",
  };

  const dateFormat = formats[interval];

  // Build match conditions dynamically
  const matchConditions: any = {
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  // Handle status filtering
  if (status) {
    if (status === "all") {
      // Include all statuses except maybe cancelled if you want
      // matchConditions.status = { $ne: "cancelled" }; // Optional: exclude cancelled
    } else if (status === "completed") {
      // Include delivered and confirmed orders
      matchConditions.status = { $in: ["delivered", "confirmed"] };
    } else {
      // Specific status
      matchConditions.status = status;
    }
  }

  const result = await Order.aggregate([
    {
      $match: matchConditions,
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: dateFormat,
            date: "$createdAt",
            timezone: "UTC",
          },
        },
        revenue: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return result.map((item) => ({
    date: item._id,
    revenue: item.revenue ?? 0,
    orders: item.orders ?? 0,
  }));
};

// ───────────────────────────────────────────────
// INVOICE FUNCTIONS
// ───────────────────────────────────────────────
export const generateInvoice = async (
  orderId: string,
  userId?: string,
  isAdmin: boolean = false,
): Promise<{ message: string; orderId: string }> => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError("Order not found", 404);

  if (!isAdmin && userId && order.user.toString() !== userId.toString()) {
    throw new ApiError("You are not authorized to access this invoice", 403);
  }

  await sendInvoiceEmail(order);

  return {
    message: "Invoice sent successfully",
    orderId: order._id.toString(),
  };
};

export const downloadInvoice = async (
  orderId: string,
  userId?: string,
  isAdmin: boolean = false,
): Promise<{ html: string; filename: string }> => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError("Order not found", 404);

  if (!isAdmin && userId && order.user.toString() !== userId.toString()) {
    throw new ApiError("You are not authorized to download this invoice", 403);
  }

  const html = generateInvoiceHtml(order);
  const filename = `invoice-${order.orderNumber}.html`;

  return { html, filename };
};

export const previewInvoice = async (
  orderId: string,
  userId?: string,
  isAdmin: boolean = false,
): Promise<string> => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId)
    .populate("user", "name email phone")
    .populate("items.product", "name price");

  if (!order) throw new ApiError("Order not found", 404);

  if (!isAdmin && userId && order.user.toString() !== userId.toString()) {
    throw new ApiError("You are not authorized to view this invoice", 403);
  }

  return generateInvoiceHtml(order);
};

const generateInvoiceHtml = (order: IOrderDocument): string => {
  const invoiceDate = new Date().toLocaleDateString("en-GB");
  const dueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toLocaleDateString("en-GB");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice #INV-${order.orderNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; }
        body { background: #f5f5f5; padding: 20px; }
        .invoice-container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #4CAF50; }
        .logo { max-width: 150px; }
        .invoice-title { font-size: 32px; color: #333; font-weight: bold; }
        .invoice-details { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .company-info, .customer-info { flex: 1; }
        .company-info h3, .customer-info h3 { color: #4CAF50; margin-bottom: 15px; font-size: 18px; }
        .company-info p, .customer-info p { margin-bottom: 8px; color: #555; }
        .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .invoice-table th { background: #4CAF50; color: white; padding: 15px; text-align: left; }
        .invoice-table td { padding: 15px; border-bottom: 1px solid #ddd; }
        .invoice-table tr:nth-child(even) { background: #f9f9f9; }
        .total-section { text-align: right; margin-top: 30px; }
        .total-row { display: flex; justify-content: flex-end; margin-bottom: 10px; }
        .total-label { width: 150px; text-align: right; padding-right: 20px; color: #555; }
        .total-value { width: 150px; text-align: right; font-weight: bold; }
        .grand-total { font-size: 24px; color: #4CAF50; margin-top: 10px; }
        .payment-info { margin-top: 40px; padding: 20px; background: #f9f9f9; border-radius: 5px; }
        .footer { margin-top: 40px; text-align: center; color: #777; font-size: 14px; padding-top: 20px; border-top: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <img src="https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png" alt="YMA Bouncy Castle" class="logo">
          <div class="invoice-title">INVOICE</div>
        </div>

        <div class="invoice-details">
          <div class="company-info">
            <h3>From:</h3>
            <p><strong>YMA Bouncy Castle</strong></p>
            <p>Bristol, United Kingdom</p>
            <p>Phone: 07951 431111</p>
            <p>Email: orders@ymabouncycastle.co.uk</p>
          </div>
          <div class="customer-info">
            <h3>Bill To:</h3>
            <p><strong>${order.shippingAddress.firstName} ${order.shippingAddress.lastName}</strong></p>
            <p>${order.shippingAddress.companyName || ""}</p>
            <p>${order.shippingAddress.street}</p>
            <p>${order.shippingAddress.city}, ${order.shippingAddress.zipCode}</p>
            <p>${order.shippingAddress.country}</p>
            <p>Email: ${order.shippingAddress.email}</p>
            <p>Phone: ${order.shippingAddress.phone}</p>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <p><strong>Invoice Number:</strong> INV-${order.orderNumber}</p>
            <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
          </div>
          <div>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Due Date:</strong> ${dueDate}</p>
            <p><strong>Invoice Type:</strong> ${order.invoiceType === "corporate" ? "Corporate" : "Regular"}</p>
          </div>
        </div>

        <table class="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items
              .map(
                (item) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>£${item.price.toFixed(2)}</td>
                <td>£${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
            ${order.deliveryFee > 0 ? `<tr><td colspan="3">Delivery Fee</td><td>£${order.deliveryFee.toFixed(2)}</td></tr>` : ""}
            ${order.overnightFee > 0 ? `<tr><td colspan="3">Overnight Keeping Fee</td><td>£${order.overnightFee.toFixed(2)}</td></tr>` : ""}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-row"><div class="total-label">Subtotal:</div><div class="total-value">£${order.subtotalAmount.toFixed(2)}</div></div>
          ${order.deliveryFee > 0 ? `<div class="total-row"><div class="total-label">Delivery Fee:</div><div class="total-value">£${order.deliveryFee.toFixed(2)}</div></div>` : ""}
          ${order.overnightFee > 0 ? `<div class="total-row"><div class="total-label">Overnight Fee:</div><div class="total-value">£${order.overnightFee.toFixed(2)}</div></div>` : ""}
          <div class="total-row grand-total">
            <div class="total-label">TOTAL:</div>
            <div class="total-value">£${order.totalAmount.toFixed(2)}</div>
          </div>
        </div>

        <div class="payment-info">
          <h3>Payment Information</h3>
          <p><strong>Payment Method:</strong> ${
            order.paymentMethod === "cash_on_delivery"
              ? "Cash on Delivery"
              : order.paymentMethod === "credit_card"
                ? "Credit Card"
                : "Online Payment"
          }</p>
          <p><strong>Payment Status:</strong> ${order.status === "delivered" ? "Paid" : "Pending"}</p>
          <p><strong>Bank Details:</strong> ${order.bankDetails || "Account details will be provided separately"}</p>
        </div>

        <div class="footer">
          <p>Thank you for choosing YMA Bouncy Castle!</p>
          <p>© ${new Date().getFullYear()} YMA Bouncy Castle. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// ───────────────────────────────────────────────
// ADDITIONAL UTILITY FUNCTIONS
// ───────────────────────────────────────────────

export const getPendingConfirmationsCount = async (): Promise<number> => {
  return await Order.countDocuments({ status: ORDER_STATUS.PENDING });
};

export const getTodayBookings = async (): Promise<IOrderDocument[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await Order.find({
    createdAt: { $gte: today, $lt: tomorrow },
  })
    .populate("user", "name email phone")
    .populate("items.product", "name imageCover price")
    .sort({ createdAt: -1 });
};

export const getTodayDeliveries = async (): Promise<IOrderDocument[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await Order.find({
    status: ORDER_STATUS.DELIVERED,
    deliveryDate: { $gte: today, $lt: tomorrow },
  })
    .populate("user", "name email phone")
    .populate("items.product", "name imageCover price")
    .sort({ deliveryDate: -1 });
};

export const getOrderSummary = async (
  orderId: string,
): Promise<{
  order: IOrderDocument;
  user: any;
  customer: any;
}> => {
  const order = await getOrderById(orderId);

  const user = await User.findById(order.user).select(
    "name email phone address city postcode createdAt",
  );

  const customer = await Customer.findOne({ user: order.user });

  return { order, user, customer };
};

export const getOrdersByUserId = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
): Promise<{ orders: IOrderDocument[]; total: number; pages: number }> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError("Invalid user ID", 400);
  }

  const skip = (page - 1) * limit;

  const query = { user: new mongoose.Types.ObjectId(userId) };

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate("items.product", "name imageCover price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(query),
  ]);

  return {
    orders,
    total,
    pages: Math.ceil(total / limit),
  };
};

export const searchOrders = async (
  searchTerm: string,
  page: number = 1,
  limit: number = 20,
): Promise<{ orders: IOrderDocument[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;
  const searchRegex = new RegExp(searchTerm, "i");

  const query = {
    $or: [
      { orderNumber: searchRegex },
      { "shippingAddress.firstName": searchRegex },
      { "shippingAddress.lastName": searchRegex },
      { "shippingAddress.email": searchRegex },
      { "shippingAddress.phone": searchRegex },
      { "shippingAddress.city": searchRegex },
      { "shippingAddress.zipCode": searchRegex },
      { "shippingAddress.companyName": searchRegex },
    ],
  };

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate("user", "name email phone")
      .populate("items.product", "name imageCover price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(query),
  ]);

  const hydratedOrders = (orders || []).map((order: any) => {
    if (!Array.isArray(order.items)) return order;
    order.items = order.items.map((item: any) => {
      const productImage =
        (Array.isArray(item?.product?.imageCover)
          ? item.product.imageCover[0]
          : item?.product?.imageCover) ||
        item?.imageCover ||
        null;
      const productName = item?.product?.name || item?.name || "Unknown Item";
      const productPrice = item?.product?.price || item?.price || 0;

      if (!item?.product) {
        return {
          ...item,
          imageCover: productImage,
          product: {
            name: productName,
            imageCover: productImage,
            price: productPrice,
          },
        };
      }

      return {
        ...item,
        name: item?.name || productName,
        imageCover: productImage,
        product: {
          ...item.product,
          name: productName,
          imageCover: productImage,
          price: productPrice,
        },
      };
    });
    return order;
  });

  return {
    orders: hydratedOrders as unknown as IOrderDocument[],
    total,
    pages: Math.ceil(total / limit),
  };
};

export const getTodayOrders = async (): Promise<IOrderDocument[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await Order.find({
    createdAt: { $gte: today, $lt: tomorrow },
  })
    .populate("user", "name email phone")
    .populate("items.product", "name imageCover price")
    .sort({ createdAt: -1 });
};

export const getPendingOrders = async (): Promise<IOrderDocument[]> => {
  return await Order.find({ status: ORDER_STATUS.PENDING })
    .populate("user", "name email phone")
    .populate("items.product", "name imageCover price")
    .sort({ createdAt: -1 });
};

export const getOrdersByStatus = async (
  status: string,
  page: number = 1,
  limit: number = 20,
): Promise<{ orders: IOrderDocument[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;

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
      400,
    );
  }

  const [orders, total] = await Promise.all([
    Order.find({ status })
      .populate("user", "name email phone")
      .populate("items.product", "name imageCover price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments({ status }),
  ]);

  return { orders, total, pages: Math.ceil(total / limit) };
};
