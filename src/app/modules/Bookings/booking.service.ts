import mongoose, { Types } from "mongoose";
import Booking, { IBookingDocument } from "../Bookings/booking.model";
import Cart from "../Cart/cart.model";
import Product from "../Product/product.model";
import ApiError from "../../utils/apiError";
import {
  IBooking,
  CreateBookingData,
  UpdateBookingData,
  BookingStats,
  BookingFilter,
} from "../Bookings/booking.interface";
// Use your existing ICartItem interface
import { ICartItem } from "../Cart/cart.interface";

export class BookingService {
  /**
   * Create booking from cart
   */
  static async createBookingFromCart(
    userId: Types.ObjectId,
    data: CreateBookingData
  ): Promise<IBookingDocument> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get user cart
      const cart = await Cart.findOne({ user: userId }).session(session);
      if (!cart || cart.items.length === 0) {
        throw new ApiError("Cart is empty", 400);
      }

      let subTotal = 0;
      const bookingItems = [];

      // Process each cart item - use your ICartItem interface with type assertion
      for (const item of cart.items as ICartItem[]) {
        const product = await Product.findById(item.product).session(session);
        if (!product) {
          throw new ApiError(`Product not found: ${item.product}`, 404);
        }

        // Check product availability
        if (product.stock < item.quantity) {
          throw new ApiError(`Insufficient stock for ${product.name}`, 400);
        }

        // Calculate rental duration
        if (!item.startDate || !item.endDate) {
          throw new ApiError(
            "Start date and end date are required for booking",
            400
          );
        }

        const startDate = new Date(item.startDate);
        const endDate = new Date(item.endDate);
        const totalDays = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (totalDays < 1) {
          throw new ApiError("Minimum booking duration is 1 day", 400);
        }

        // Check if product is available for the selected dates
        const existingBookings = await Booking.find({
          "items.product": product._id,
          $or: [
            {
              "items.startDate": { $lte: endDate },
              "items.endDate": { $gte: startDate },
            },
          ],
          status: { $nin: ["cancelled", "refunded"] },
        }).session(session);

        const bookedQuantity = existingBookings.reduce((total, booking) => {
          const bookingItem = booking.items.find(
            (i) => i.product.toString() === product._id.toString()
          );
          return total + (bookingItem?.quantity || 0);
        }, 0);

        if (product.stock - bookedQuantity < item.quantity) {
          throw new ApiError(
            `Not enough stock available for ${product.name} on selected dates`,
            400
          );
        }

        // Update product stock
        product.stock -= item.quantity;
        await product.save({ session });

        // Calculate item total
        const itemTotal = item.quantity * item.price * totalDays;
        subTotal += itemTotal;

        // Use type assertion for rentalType since it's optional in ICartItem
        bookingItems.push({
          product: product._id,
          quantity: item.quantity,
          price: item.price,
          name: product.name,
          startDate,
          endDate,
          totalDays,
          rentalType: (item as any).rentalType || "daily", // Type assertion
        });
      }

      // Calculate totals
      const taxRate = 0.2; // 20% VAT
      const taxAmount = subTotal * taxRate;
      const deliveryFee = data.shippingAddress.city === "London" ? 25 : 35;
      const totalAmount = subTotal + taxAmount + deliveryFee;

      // Generate booking number
      const bookingNumber = await Booking.generateBookingNumber();

      // Create booking with proper typing
      const bookingData = {
        bookingNumber,
        user: userId,
        items: bookingItems,
        shippingAddress: data.shippingAddress,
        payment: {
          method: data.paymentMethod,
          status:
            data.paymentMethod === "cash_on_delivery" ? "pending" : "pending",
          amount: totalAmount,
        },
        status: "pending" as const,
        statusHistory: [
          {
            status: "pending" as const,
            changedAt: new Date(),
            changedBy: userId,
            notes: "Booking created",
          },
        ],
        totalAmount,
        subTotal,
        taxAmount,
        deliveryFee,
        invoiceType: data.invoiceType || ("regular" as const),
        bankDetails: data.bankDetails,
        termsAccepted: data.termsAccepted,
        customerNotes: data.customerNotes,
        estimatedDeliveryDate: bookingItems[0]?.startDate,
        estimatedCollectionDate: bookingItems[0]?.endDate,
      };

      // Create booking - explicitly type the result
      const bookingResult = await Booking.create([bookingData], { session });

      // Get the booking ID with type assertion
      const bookingId = (bookingResult[0] as any)._id.toString();

      // Clear cart
      cart.items = [];
      await cart.save({ session });

      await session.commitTransaction();

      // Get populated booking
      const populatedBooking = await this.getBookingById(bookingId);

      // Email sending commented out for now - uncomment when email functions are implemented
      // await sendBookingConfirmationEmail(populatedBooking);

      return populatedBooking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get booking by ID
   */
  static async getBookingById(bookingId: string): Promise<IBookingDocument> {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw new ApiError("Invalid booking ID", 400);
    }

    const booking = await Booking.findById(bookingId)
      .populate("user", "name email phone")
      .populate("items.product", "name imageCover price category")
      .populate("statusHistory.changedBy", "name email");

    if (!booking) {
      throw new ApiError("Booking not found", 404);
    }

    return booking;
  }

  /**
   * Get all bookings with filters (Admin)
   */
  static async getAllBookings(
    filters: BookingFilter = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ bookings: IBookingDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    // Apply filters
    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.userId) {
      query.user = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    if (filters.paymentStatus) {
      query["payment.status"] = filters.paymentStatus;
    }

    if (filters.minAmount || filters.maxAmount) {
      query.totalAmount = {};
      if (filters.minAmount) query.totalAmount.$gte = Number(filters.minAmount);
      if (filters.maxAmount) query.totalAmount.$lte = Number(filters.maxAmount);
    }

    if (filters.search) {
      query.$or = [
        { bookingNumber: { $regex: filters.search, $options: "i" } },
        {
          "shippingAddress.firstName": {
            $regex: filters.search,
            $options: "i",
          },
        },
        {
          "shippingAddress.lastName": { $regex: filters.search, $options: "i" },
        },
        { "shippingAddress.email": { $regex: filters.search, $options: "i" } },
        { "shippingAddress.phone": { $regex: filters.search, $options: "i" } },
      ];
    }

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate("user", "name email phone")
        .populate("items.product", "name imageCover")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(query),
    ]);

    return {
      bookings,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get user's bookings
   */
  static async getUserBookings(userId: string): Promise<IBookingDocument[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError("Invalid user ID", 400);
    }

    return await Booking.find({ user: userId })
      .populate("items.product", "name imageCover price")
      .sort({ createdAt: -1 });
  }

  /**
   * Update booking (Admin only)
   */
  static async updateBooking(
    bookingId: string,
    updateData: UpdateBookingData,
    adminId: Types.ObjectId
  ): Promise<IBookingDocument> {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw new ApiError("Invalid booking ID", 400);
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new ApiError("Booking not found", 404);
    }

    // Handle status update
    if (updateData.status && updateData.status !== booking.status) {
      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        pending: ["confirmed", "cancelled"],
        confirmed: ["payment_pending", "cancelled"],
        payment_pending: ["payment_completed", "cancelled"],
        payment_completed: ["processing", "cancelled"],
        processing: ["ready_for_delivery", "cancelled"],
        ready_for_delivery: ["out_for_delivery", "cancelled"],
        out_for_delivery: ["delivered", "cancelled"],
        delivered: ["ready_for_collection", "completed"],
        ready_for_collection: ["collected", "completed"],
        cancelled: ["refunded"],
        refunded: [],
      };

      if (!validTransitions[booking.status]?.includes(updateData.status)) {
        throw new ApiError(
          `Invalid status transition from ${booking.status} to ${updateData.status}`,
          400
        );
      }

      // Update status history
      booking.statusHistory.push({
        status: updateData.status,
        changedAt: new Date(),
        changedBy: adminId,
        notes: updateData.adminNotes || "Status updated by admin",
      });

      // Handle specific status updates
      if (updateData.status === "delivered") {
        booking.actualDeliveryDate = new Date();
      } else if (updateData.status === "collected") {
        booking.actualCollectionDate = new Date();
      } else if (
        updateData.status === "cancelled" &&
        updateData.cancellationReason
      ) {
        booking.cancellationReason = updateData.cancellationReason;

        // Restore product stock
        await this.restoreProductStock(booking);
      } else if (updateData.status === "refunded") {
        booking.refundedAt = new Date();
        booking.refundAmount = booking.totalAmount;
        booking.payment.status = "refunded";
      }

      booking.status = updateData.status;
    }

    // Update other fields
    if (updateData.adminNotes) {
      booking.adminNotes = updateData.adminNotes;
    }

    if (updateData.estimatedDeliveryDate) {
      booking.estimatedDeliveryDate = new Date(
        updateData.estimatedDeliveryDate
      );
    }

    if (updateData.estimatedCollectionDate) {
      booking.estimatedCollectionDate = new Date(
        updateData.estimatedCollectionDate
      );
    }

    if (updateData.payment) {
      Object.assign(booking.payment, updateData.payment);
    }

    await booking.save();

    // Get populated booking
    const populatedBooking = await this.getBookingById(bookingId);

    // Email sending commented out for now
    // await sendBookingStatusUpdateEmail(populatedBooking);

    return populatedBooking;
  }

  /**
   * Cancel booking (User)
   */
  static async cancelBooking(
    bookingId: string,
    userId: Types.ObjectId,
    reason: string
  ): Promise<IBookingDocument> {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw new ApiError("Invalid booking ID", 400);
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new ApiError("Booking not found", 404);
    }

    // Check ownership
    if (booking.user.toString() !== userId.toString()) {
      throw new ApiError("You can only cancel your own bookings", 403);
    }

    // Check if booking can be cancelled
    const cancellableStatuses = ["pending", "confirmed", "payment_pending"];
    if (!cancellableStatuses.includes(booking.status)) {
      throw new ApiError(
        `Booking cannot be cancelled in ${booking.status} status`,
        400
      );
    }

    // Update booking
    booking.status = "cancelled";
    booking.cancellationReason = reason;
    booking.statusHistory.push({
      status: "cancelled",
      changedAt: new Date(),
      changedBy: userId,
      notes: `Cancelled by user: ${reason}`,
    });

    // Restore product stock
    await this.restoreProductStock(booking);

    await booking.save();

    return await this.getBookingById(bookingId);
  }

  /**
   * Get booking statistics (Admin)
   */
  static async getBookingStats(): Promise<BookingStats> {
    const [
      totalBookings,
      pendingBookings,
      confirmedBookings,
      activeBookings,
      completedBookings,
      cancelledBookings,
      revenueStats,
      monthlyRevenue,
      pendingPaymentStats,
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: "pending" }),
      Booking.countDocuments({ status: "confirmed" }),
      Booking.countDocuments({
        status: {
          $in: [
            "payment_completed",
            "processing",
            "ready_for_delivery",
            "out_for_delivery",
          ],
        },
      }),
      Booking.countDocuments({
        status: { $in: ["delivered", "collected", "completed"] },
      }),
      Booking.countDocuments({ status: "cancelled" }),
      Booking.aggregate([
        { $match: { status: { $nin: ["cancelled", "refunded"] } } },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
            avg: { $avg: "$totalAmount" },
          },
        },
      ]),
      Booking.aggregate([
        {
          $match: {
            status: { $nin: ["cancelled", "refunded"] },
            createdAt: {
              $gte: new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1
              ),
            },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Booking.aggregate([
        { $match: { "payment.status": "pending" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
    ]);

    const revenue = revenueStats[0] || { total: 0, avg: 0 };
    const monthly = monthlyRevenue[0] || { total: 0 };
    const pendingPayment = pendingPaymentStats[0] || { total: 0 };

    return {
      totalBookings,
      pendingBookings,
      confirmedBookings,
      activeBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue: revenue.total,
      monthlyRevenue: monthly.total,
      pendingPaymentAmount: pendingPayment.total,
      averageBookingValue: revenue.avg,
    };
  }

  /**
   * Get upcoming deliveries
   */
  static async getUpcomingDeliveries(
    days: number = 7
  ): Promise<IBookingDocument[]> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return await Booking.find({
      status: { $in: ["ready_for_delivery", "out_for_delivery"] },
      estimatedDeliveryDate: { $gte: startDate, $lte: endDate },
    })
      .populate("user", "name email phone")
      .populate("items.product", "name")
      .sort({ estimatedDeliveryDate: 1 });
  }

  /**
   * Search bookings (Admin)
   */
  static async searchBookings(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ bookings: IBookingDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const searchFilter = {
      $or: [
        { bookingNumber: { $regex: query, $options: "i" } },
        { "shippingAddress.firstName": { $regex: query, $options: "i" } },
        { "shippingAddress.lastName": { $regex: query, $options: "i" } },
        { "shippingAddress.email": { $regex: query, $options: "i" } },
        { "shippingAddress.phone": { $regex: query, $options: "i" } },
        { "items.name": { $regex: query, $options: "i" } },
      ],
    };

    const [bookings, total] = await Promise.all([
      Booking.find(searchFilter)
        .populate("user", "name email phone")
        .populate("items.product", "name imageCover")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(searchFilter),
    ]);

    return {
      bookings,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Restore product stock when booking is cancelled
   */
  private static async restoreProductStock(
    booking: IBookingDocument
  ): Promise<void> {
    for (const item of booking.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }
  }

  /**
   * Update booking payment status
   */
  static async updatePaymentStatus(
    bookingId: string,
    paymentStatus: "pending" | "paid" | "failed" | "refunded",
    transactionId?: string
  ): Promise<IBookingDocument> {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw new ApiError("Invalid booking ID", 400);
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new ApiError("Booking not found", 404);
    }

    booking.payment.status = paymentStatus;
    if (transactionId) {
      booking.payment.transactionId = transactionId;
    }

    if (paymentStatus === "paid") {
      booking.payment.paidAt = new Date();

      // Auto-confirm booking if payment is completed
      if (booking.status === "payment_pending") {
        booking.status = "payment_completed";
        booking.statusHistory.push({
          status: "payment_completed",
          changedAt: new Date(),
          changedBy: booking.user,
          notes: "Payment completed successfully",
        });
      }
    }

    await booking.save();
    return await this.getBookingById(bookingId);
  }

  /**
   * Get bookings by date range
   */
  static async getBookingsByDateRange(
    startDate: Date,
    endDate: Date,
    status?: string
  ): Promise<IBookingDocument[]> {
    const query: any = {
      "items.startDate": { $gte: startDate },
      "items.endDate": { $lte: endDate },
    };

    if (status) {
      query.status = status;
    }

    return await Booking.find(query)
      .populate("user", "name email phone")
      .populate("items.product", "name imageCover")
      .sort({ "items.startDate": 1 });
  }

  /**
   * Get booking by booking number
   */
  static async getBookingByNumber(
    bookingNumber: string
  ): Promise<IBookingDocument> {
    const booking = await Booking.findOne({ bookingNumber })
      .populate("user", "name email phone")
      .populate("items.product", "name imageCover price category")
      .populate("statusHistory.changedBy", "name email");

    if (!booking) {
      throw new ApiError("Booking not found", 404);
    }

    return booking;
  }

  /**
   * Get active bookings (for dashboard)
   */
  static async getActiveBookings(): Promise<IBookingDocument[]> {
    return await Booking.find({
      status: {
        $in: [
          "confirmed",
          "payment_completed",
          "processing",
          "ready_for_delivery",
          "out_for_delivery",
        ],
      },
    })
      .populate("user", "name email phone")
      .populate("items.product", "name imageCover")
      .sort({ estimatedDeliveryDate: 1 })
      .limit(10);
  }
}

export default BookingService;
