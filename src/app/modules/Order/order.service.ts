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
  PAYMENT_METHODS,
  INVOICE_TYPES,
  DeliveryTimeManager,
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

export const createOrder = async (
  userId: string,
  orderData: any
): Promise<any> => {
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

    // 1. Validate and process order items
    let subtotalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) {
        throw new ApiError(`Product ${item.productId} not found`, 404);
      }
      if (product.stock < item.quantity) {
        throw new ApiError(
          `Insufficient stock for ${product.name}. Available: ${product.stock}`,
          400
        );
      }

      // Update product stock
      product.stock -= item.quantity;
      await product.save({ session });

      const itemTotal = product.price * item.quantity;
      subtotalAmount += itemTotal;

      processedItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        startDate: item.startDate,
        endDate: item.endDate,
        hireOccasion: item.hireOccasion,
        keepOvernight: item.keepOvernight || false,
      });
    }

    // 2. Get user info
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new ApiError("User not found", 404);
    }

    // 3. Calculate delivery fee
    const deliveryTime = shippingAddress?.deliveryTime || "8am-12pm";
    let deliveryFee = DeliveryTimeManager.getFee(deliveryTime);

    // Add collection fee if specified
    if (
      shippingAddress?.collectionTime &&
      shippingAddress.collectionTime.trim() !== ""
    ) {
      const collectionOptions = [
        { value: "before_5pm", fee: 0 },
        { value: "after_5pm", fee: 10 },
        { value: "next_day", fee: 10 },
      ];
      const collectionOption = collectionOptions.find(
        (opt) => opt.value === shippingAddress.collectionTime
      );
      if (collectionOption) {
        deliveryFee += collectionOption.fee;
      }
    }

    // 4. Calculate overnight fee
    const overnightFee = processedItems.reduce((total, item) => {
      return total + (item.keepOvernight ? 50 : 0);
    }, 0);

    const discountAmount = promoDiscount || 0;
    const totalAmount =
      subtotalAmount + deliveryFee + overnightFee - discountAmount;

    // 5. Create order
    const order = new Order({
      user: userId,
      items: processedItems,
      subtotalAmount,
      deliveryFee,
      overnightFee,
      discountAmount,
      totalAmount,
      paymentMethod,
      status: "pending",
      shippingAddress: {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        phone: shippingAddress.phone,
        email: shippingAddress.email,
        country: shippingAddress.country || "UK",
        city: shippingAddress.city,
        street: shippingAddress.street,
        zipCode: shippingAddress.zipCode,
        apartment: shippingAddress.apartment || "",
        location: shippingAddress.location || "",
        companyName: shippingAddress.companyName || "",
        locationAccessibility: shippingAddress.locationAccessibility || "",
        deliveryTime: deliveryTime,
        collectionTime: shippingAddress.collectionTime || "",
        floorType: shippingAddress.floorType || "",
        userType: shippingAddress.userType || "",
        keepOvernight: overnightFee > 0,
        hireOccasion: shippingAddress.hireOccasion || "birthday",
        notes: shippingAddress.notes || "",
        differentBillingAddress:
          shippingAddress.differentBillingAddress || false,
        billingFirstName: shippingAddress.billingFirstName || "",
        billingLastName: shippingAddress.billingLastName || "",
        billingStreet: shippingAddress.billingStreet || "",
        billingCity: shippingAddress.billingCity || "",
        billingZipCode: shippingAddress.billingZipCode || "",
        billingCompanyName: shippingAddress.billingCompanyName || "",
      },
      termsAccepted: termsAccepted,
      invoiceType: invoiceType,
      bankDetails: bankDetails,
      promoCode: promoCode,
      promoDiscount: promoDiscount,
      estimatedDeliveryDate:
        estimatedDeliveryDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    });

    await order.save({ session });

    // 6. Create or update customer (treat user as customer)
    await createOrUpdateCustomerFromOrder(
      userId,
      user,
      order,
      shippingAddress,
      session
    );

    // 7. Commit transaction
    await session.commitTransaction();
    session.endSession();

    // 8. Send emails
    try {
      await sendOrderReceivedEmail(order);
      await notifyAdminNewOrder(order);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    return order;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// Helper function to create/update customer
const createOrUpdateCustomerFromOrder = async (
  userId: string,
  user: any,
  order: any,
  shippingAddress: any,
  session: mongoose.ClientSession
): Promise<void> => {
  try {
    // Check if customer exists
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
      // Update existing customer
      customer.totalOrders += 1;
      customer.totalSpent += order.totalAmount || 0;
      customer.lastOrderDate = new Date();

      if (!customer.firstOrderDate) {
        customer.firstOrderDate = new Date();
      }

      // Update contact info if not present
      if (!customer.phone && customerData.phone) {
        customer.phone = customerData.phone;
      }
      if (!customer.address && customerData.address) {
        customer.address = customerData.address;
      }
      if (!customer.city && customerData.city) {
        customer.city = customerData.city;
      }
      if (!customer.postcode && customerData.postcode) {
        customer.postcode = customerData.postcode;
      }

      await customer.save({ session });
    } else {
      // Create new customer
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

    // Also update user with customer info
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
      { session }
    );
  } catch (error) {
    console.error("Error in customer creation:", error);
  }
};

// Get order by ID
export const getOrderById = async (
  orderId: string
): Promise<IOrderDocument> => {
  if (!orderId || typeof orderId !== "string") {
    throw new ApiError("Order ID is required", 400);
  }

  let order: IOrderDocument | null = null;

  // Try by MongoDB ObjectId
  if (mongoose.Types.ObjectId.isValid(orderId) && orderId.length === 24) {
    order = await Order.findById(orderId)
      .populate("user", "name email phone address city postcode")
      .populate("items.product", "name imageCover price category description");
  }

  // Try by orderNumber
  if (!order) {
    order = await Order.findOne({ orderNumber: orderId })
      .populate("user", "name email phone address city postcode")
      .populate("items.product", "name imageCover price category description");
  }

  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  return order;
};

// Get all orders
export const getAllOrders = async (
  page: number = 1,
  limit: number = 20,
  filters: FilterOptions = {}
): Promise<{ orders: IOrderDocument[]; total: number; pages: number }> => {
  try {
    const skip = (page - 1) * limit;
    const query: any = {};

    // Apply filters
    if (filters.status && filters.status !== "all") {
      query.status = filters.status;
    }

    if (filters.userId && mongoose.Types.ObjectId.isValid(filters.userId)) {
      query.user = new mongoose.Types.ObjectId(filters.userId);
    }

    if (filters.paymentMethod && filters.paymentMethod !== "all") {
      query.paymentMethod = filters.paymentMethod;
    }

    if (filters.startDate) {
      query.createdAt = { $gte: new Date(filters.startDate) };
    }

    if (filters.endDate) {
      query.createdAt = { ...query.createdAt, $lte: new Date(filters.endDate) };
    }

    if (filters.minAmount !== undefined) {
      query.totalAmount = { $gte: filters.minAmount };
    }

    if (filters.maxAmount !== undefined) {
      query.totalAmount = { ...query.totalAmount, $lte: filters.maxAmount };
    }

    if (filters.search && filters.search.trim()) {
      const searchRegex = new RegExp(filters.search.trim(), "i");
      query.$or = [
        { orderNumber: searchRegex },
        { "shippingAddress.firstName": searchRegex },
        { "shippingAddress.lastName": searchRegex },
        { "shippingAddress.email": searchRegex },
        { "shippingAddress.phone": searchRegex },
        { "shippingAddress.city": searchRegex },
        { "shippingAddress.zipCode": searchRegex },
        { "shippingAddress.companyName": searchRegex },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("user", "name email phone")
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
  } catch (error: any) {
    console.error("Error in getAllOrders:", error.message);
    return {
      orders: [],
      total: 0,
      pages: 0,
    };
  }
};

// Update order
export const updateOrder = async (
  orderId: string,
  updateData: UpdateOrderInput,
  userId?: string,
  isAdmin: boolean = false
): Promise<IOrderDocument> => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  // Check authorization
  if (!isAdmin && userId && order.user.toString() !== userId.toString()) {
    throw new ApiError("You are not authorized to update this order", 403);
  }

  const previousStatus = order.status;

  // Users can only update shipping address fields
  if (!isAdmin) {
    const allowedFields = ["shippingAddress", "bankDetails", "invoiceType"];
    const filteredData: any = {};

    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredData[key] = (updateData as any)[key];
      }
    });

    if (updateData.status && updateData.status !== order.status) {
      throw new ApiError("Only admins can update order status", 403);
    }

    updateData = filteredData as UpdateOrderInput;
  }

  // Handle delivery time
  if (updateData.shippingAddress?.deliveryTime) {
    updateData.shippingAddress.deliveryTime =
      DeliveryTimeManager.normalizeForDatabase(
        updateData.shippingAddress.deliveryTime
      );
  }

  // Merge shipping address
  if (updateData.shippingAddress && order.shippingAddress) {
    updateData.shippingAddress = {
      ...order.shippingAddress.toObject(),
      ...updateData.shippingAddress,
    };
  }

  // Update fields
  Object.keys(updateData).forEach((key) => {
    if (updateData[key as keyof UpdateOrderInput] !== undefined) {
      (order as any)[key] = updateData[key as keyof UpdateOrderInput];
    }
  });

  await order.save();

  // Send email notifications for status changes
  if (isAdmin && updateData.status && updateData.status !== previousStatus) {
    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone")
      .populate("items.product", "name imageCover price");

    if (populatedOrder) {
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
      }
    }
  }

  return order;
};

// Add this function to your order.service.ts (replace the existing updateOrderStatus)
export const updateOrderStatus = async (
  orderId: string,
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled",
  adminNotes?: string
): Promise<IOrderDocument> => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId)
    .populate("user", "name email phone")
    .populate("items.product", "name imageCover price");

  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  const previousStatus = order.status;

  // Update order status
  order.status = status;
  if (adminNotes) {
    order.adminNotes = adminNotes;
  }

  // Update delivery date if status is delivered
  if (status === ORDER_STATUS.DELIVERED) {
    order.deliveryDate = new Date();
  }

  await order.save();

  // Send email notifications for status changes
  if (status !== previousStatus) {
    try {
      switch (status) {
        case ORDER_STATUS.CONFIRMED:
          await sendOrderConfirmedEmail(order);
          break;
        case ORDER_STATUS.SHIPPED:
          await sendDeliveryReminderEmail(order);
          break;
        case ORDER_STATUS.DELIVERED:
          await sendDeliveryCompleteEmail(order);
          break;
        case ORDER_STATUS.CANCELLED:
          await sendOrderCancelledEmail(order);
          break;
      }
    } catch (emailError) {
      console.error("Failed to send status change email:", emailError);
      // Don't throw error, just log it
    }
  }

  return order;
};

// Update the generateInvoice function
export const generateInvoice = async (
  orderId: string,
  userId?: string,
  isAdmin: boolean = false
): Promise<{ message: string; orderId: string }> => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  if (!isAdmin && userId && order.user.toString() !== userId.toString()) {
    throw new ApiError("You are not authorized to access this invoice", 403);
  }

  // Send email WITHOUT attachments - invoice is included in email body
  await sendInvoiceEmail(order);

  return {
    message: "Invoice sent successfully",
    orderId: order._id.toString(),
  };
};

// Delete order
export const deleteOrder = async (
  orderId: string,
  userId?: string
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  // Check authorization
  if (userId && order.user.toString() !== userId.toString()) {
    throw new ApiError("You are not authorized to delete this order", 403);
  }

  if (
    ![ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED].includes(
      order.status as any
    )
  ) {
    throw new ApiError(
      "Cannot delete confirmed, shipped, or delivered orders",
      400
    );
  }

  await order.deleteOne();
};

// Get order statistics
export const getOrderStatistics = async (): Promise<OrderStats> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [
    totalOrders,
    pendingOrders,
    confirmedOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    revenueResult,
    todayRevenueResult,
    monthlyRevenueResult,
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
          createdAt: { $gte: today, $lt: tomorrow },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.aggregate([
      {
        $match: {
          status: ORDER_STATUS.DELIVERED,
          createdAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
  ]);

  const totalRevenue = revenueResult[0]?.total || 0;
  const todayRevenue = todayRevenueResult[0]?.total || 0;
  const monthlyRevenue = monthlyRevenueResult[0]?.total || 0;
  const averageOrderValue =
    deliveredOrders > 0 ? totalRevenue / deliveredOrders : 0;

  return {
    totalOrders,
    pendingOrders,
    confirmedOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    totalRevenue,
    todayRevenue,
    monthlyRevenue,
    averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
  };
};

// NEW: Get today's revenue
export const getTodayRevenue = async (): Promise<number> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await Order.aggregate([
    {
      $match: {
        status: ORDER_STATUS.DELIVERED,
        createdAt: { $gte: today, $lt: tomorrow },
      },
    },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  return result[0]?.total || 0;
};

// NEW: Get pending confirmations count
export const getPendingConfirmationsCount = async (): Promise<number> => {
  return await Order.countDocuments({ status: ORDER_STATUS.PENDING });
};

// NEW: Get today's bookings
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
    .sort({ createdAt: -1 })
    .limit(20);
};

// NEW: Get today's deliveries
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
    .sort({ deliveryDate: -1 })
    .limit(20);
};

// NEW: Get revenue over time for charts
export const getRevenueOverTime = async (
  startDate: Date,
  endDate: Date,
  interval: "day" | "week" | "month" = "day"
): Promise<Array<{ date: string; revenue: number; orders: number }>> => {
  const matchStage = {
    $match: {
      status: ORDER_STATUS.DELIVERED,
      createdAt: { $gte: startDate, $lte: endDate },
    },
  };

  let groupStage: any;
  let dateFormat: string;

  switch (interval) {
    case "day":
      dateFormat = "%Y-%m-%d";
      groupStage = {
        $group: {
          _id: {
            $dateToString: { format: dateFormat, date: "$createdAt" },
          },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      };
      break;
    case "week":
      dateFormat = "%Y-%W";
      groupStage = {
        $group: {
          _id: {
            $dateToString: { format: dateFormat, date: "$createdAt" },
          },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      };
      break;
    case "month":
      dateFormat = "%Y-%m";
      groupStage = {
        $group: {
          _id: {
            $dateToString: { format: dateFormat, date: "$createdAt" },
          },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      };
      break;
    default:
      dateFormat = "%Y-%m-%d";
      groupStage = {
        $group: {
          _id: {
            $dateToString: { format: dateFormat, date: "$createdAt" },
          },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      };
  }

  const result = await Order.aggregate([
    matchStage,
    groupStage,
    { $sort: { _id: 1 } },
  ]);

  return result.map((item) => ({
    date: item._id,
    revenue: item.revenue,
    orders: item.orders,
  }));
};

// NEW: Get order summary with user info
export const getOrderSummary = async (
  orderId: string
): Promise<{
  order: IOrderDocument;
  user: any;
  customer: any;
}> => {
  const order = await getOrderById(orderId);

  const user = await User.findById(order.user).select(
    "name email phone address city postcode createdAt"
  );

  const customer = await Customer.findOne({ user: order.user });

  return {
    order,
    user,
    customer,
  };
};

// Get orders by user ID
export const getOrdersByUserId = async (
  userId: string,
  page: number = 1,
  limit: number = 10
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

  return { orders, total, pages: Math.ceil(total / limit) };
};

// Search orders
export const searchOrders = async (
  searchTerm: string,
  page: number = 1,
  limit: number = 20
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
      .limit(limit),
    Order.countDocuments(query),
  ]);

  return { orders, total, pages: Math.ceil(total / limit) };
};

// Get today's orders
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

// Get pending orders
export const getPendingOrders = async (): Promise<IOrderDocument[]> => {
  return await Order.find({ status: ORDER_STATUS.PENDING })
    .populate("user", "name email phone")
    .populate("items.product", "name imageCover price")
    .sort({ createdAt: -1 });
};

// Get orders by status
export const getOrdersByStatus = async (
  status: string,
  page: number = 1,
  limit: number = 20
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
      400
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

// Generate invoice HTML
const generateInvoiceHtml = (order: IOrderDocument): string => {
  const invoiceDate = new Date().toLocaleDateString("en-GB");
  const dueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
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
            <p><strong>${order.shippingAddress.firstName} ${
    order.shippingAddress.lastName
  }</strong></p>
            <p>${order.shippingAddress.companyName || ""}</p>
            <p>${order.shippingAddress.street}</p>
            <p>${order.shippingAddress.city}, ${
    order.shippingAddress.zipCode
  }</p>
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
            <p><strong>Invoice Type:</strong> ${
              order.invoiceType === "corporate" ? "Corporate" : "Regular"
            }</p>
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
            `
              )
              .join("")}
            ${
              order.deliveryFee > 0
                ? `
              <tr>
                <td colspan="3">Delivery Fee</td>
                <td>£${order.deliveryFee.toFixed(2)}</td>
              </tr>
            `
                : ""
            }
            ${
              order.overnightFee > 0
                ? `
              <tr>
                <td colspan="3">Overnight Keeping Fee</td>
                <td>£${order.overnightFee.toFixed(2)}</td>
              </tr>
            `
                : ""
            }
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-row">
            <div class="total-label">Subtotal:</div>
            <div class="total-value">£${order.subtotalAmount.toFixed(2)}</div>
          </div>
          ${
            order.deliveryFee > 0
              ? `
            <div class="total-row">
              <div class="total-label">Delivery Fee:</div>
              <div class="total-value">£${order.deliveryFee.toFixed(2)}</div>
            </div>
          `
              : ""
          }
          ${
            order.overnightFee > 0
              ? `
            <div class="total-row">
              <div class="total-label">Overnight Fee:</div>
              <div class="total-value">£${order.overnightFee.toFixed(2)}</div>
            </div>
          `
              : ""
          }
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
          <p><strong>Payment Status:</strong> ${
            order.status === "delivered" ? "Paid" : "Pending"
          }</p>
          <p><strong>Bank Details:</strong> ${
            order.bankDetails || "Account details will be provided separately"
          }</p>
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

// Generate and send invoice

// Download invoice
export const downloadInvoice = async (
  orderId: string,
  userId?: string,
  isAdmin: boolean = false
): Promise<{ html: string; filename: string }> => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  if (!isAdmin && userId && order.user.toString() !== userId.toString()) {
    throw new ApiError("You are not authorized to download this invoice", 403);
  }

  const html = generateInvoiceHtml(order);
  const filename = `invoice-${order.orderNumber}.html`;

  return { html, filename };
};

// Preview invoice
export const previewInvoice = async (
  orderId: string,
  userId?: string,
  isAdmin: boolean = false
): Promise<string> => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId)
    .populate("user", "name email phone")
    .populate("items.product", "name price");

  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  if (!isAdmin && userId && order.user.toString() !== userId.toString()) {
    throw new ApiError("You are not authorized to view this invoice", 403);
  }

  return generateInvoiceHtml(order);
};
