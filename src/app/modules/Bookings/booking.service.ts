// booking.service.ts
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
import { EmailService } from "./email.service";

export class BookingService {
  static async createBookingFromCart(
    userId: Types.ObjectId,
    data: CreateBookingData
  ): Promise<IBookingDocument> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const cart = await Cart.findOne({ user: userId }).session(session);
      if (!cart || cart.items.length === 0) {
        throw new ApiError("Cart is empty", 400);
      }

      let subTotal = 0;
      const bookingItems = [];

      for (const item of cart.items) {
        const product = await Product.findById(item.product).session(session);
        if (!product) {
          throw new ApiError(`Product not found: ${item.product}`, 404);
        }

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

        // Get inventory info (warehouse, vendor, rentalFee)
        // This assumes you have an inventory service to check availability
        const inventoryItem = {
          warehouse: "Main Warehouse", // Replace with actual inventory check
          vendor: "YMA Suppliers", // Replace with actual inventory check
          rentalFee: product.price, // Use product price or get from inventory
        };

        const itemTotal = item.quantity * item.price * totalDays;
        subTotal += itemTotal;

        bookingItems.push({
          product: product._id,
          quantity: item.quantity,
          price: item.price,
          name: product.name,
          startDate,
          endDate,
          totalDays,
          rentalType: (item as any).rentalType || "daily",
          warehouse: inventoryItem.warehouse,
          vendor: inventoryItem.vendor,
          rentalFee: inventoryItem.rentalFee,
        });
      }

      const taxRate = 0.2;
      const taxAmount = subTotal * taxRate;
      const deliveryFee = data.shippingAddress.city === "London" ? 25 : 35;
      const totalAmount = subTotal + taxAmount + deliveryFee;

      const bookingNumber = await Booking.generateBookingNumber();

      const bookingData = {
        bookingNumber,
        user: userId,
        items: bookingItems,
        shippingAddress: data.shippingAddress,
        payment: {
          method: data.paymentMethod,
          status: "pending",
          amount: totalAmount,
        },
        status: "pending",
        statusHistory: [
          {
            status: "pending",
            changedAt: new Date(),
            changedBy: userId,
            notes: "Booking created",
          },
        ],
        totalAmount,
        subTotal,
        taxAmount,
        deliveryFee,
        invoiceType: data.invoiceType || "regular",
        bankDetails: data.bankDetails,
        customerNotes: data.customerNotes,
        estimatedDeliveryDate: bookingItems[0]?.startDate,
        estimatedCollectionDate: bookingItems[0]?.endDate,
      };

      const bookingResult = await Booking.create([bookingData], { session });
      const booking = bookingResult[0];

      cart.items = [];
      await cart.save({ session });

      await session.commitTransaction();

      const populatedBooking = await this.getBookingById(
        (booking._id as string).toString()
      );

      // Send emails
      await EmailService.sendBookingConfirmation(populatedBooking);
      await EmailService.sendAdminNotification(
        populatedBooking,
        "New Booking Created"
      );

      return populatedBooking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async getBookingById(bookingId: string): Promise<IBookingDocument> {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw new ApiError("Invalid booking ID", 400);
    }

    const booking = await Booking.findById(bookingId)
      .populate("user", "name email phone")
      .populate("items.product", "name imageCover price category");

    if (!booking) {
      throw new ApiError("Booking not found", 404);
    }

    return booking;
  }

  static async getAllBookings(
    filters: BookingFilter = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ bookings: IBookingDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.userId) query.user = filters.userId;
    if (filters.paymentStatus) query["payment.status"] = filters.paymentStatus;
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
      ];
    }

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate("user", "name email phone")
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

  static async updateBooking(
    bookingId: string,
    updateData: UpdateBookingData,
    adminId: Types.ObjectId
  ): Promise<IBookingDocument> {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new ApiError("Booking not found", 404);
    }

    if (updateData.status && updateData.status !== booking.status) {
      booking.status = updateData.status;
      booking.statusHistory.push({
        status: updateData.status,
        changedAt: new Date(),
        changedBy: adminId,
        notes: updateData.adminNotes || "Status updated by admin",
      });

      await EmailService.sendBookingStatusUpdate(booking);
    }

    if (updateData.adminNotes) booking.adminNotes = updateData.adminNotes;
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

    await booking.save();
    return await this.getBookingById(bookingId);
  }

  static async cancelBooking(
    bookingId: string,
    userId: Types.ObjectId,
    reason: string
  ): Promise<IBookingDocument> {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new ApiError("Booking not found", 404);
    }

    if (booking.user.toString() !== userId.toString()) {
      throw new ApiError("You can only cancel your own bookings", 403);
    }

    booking.status = "cancelled";
    booking.cancellationReason = reason;
    booking.statusHistory.push({
      status: "cancelled",
      changedAt: new Date(),
      changedBy: userId,
      notes: `Cancelled by user: ${reason}`,
    });

    await booking.save();

    const populatedBooking = await this.getBookingById(bookingId);
    await EmailService.sendBookingStatusUpdate(populatedBooking);
    await EmailService.sendAdminNotification(
      populatedBooking,
      "Booking Cancelled"
    );

    return populatedBooking;
  }

  static async getBookingStats(): Promise<BookingStats> {
    const stats = await Booking.aggregate([
      {
        $facet: {
          counts: [
            {
              $group: {
                _id: null,
                totalBookings: { $sum: 1 },
                totalRevenue: {
                  $sum: {
                    $cond: [
                      { $in: ["$status", ["cancelled", "refunded"]] },
                      0,
                      "$totalAmount",
                    ],
                  },
                },
              },
            },
          ],
          byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          monthlyRevenue: [
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
          ],
        },
      },
    ]);

    const counts = stats[0]?.counts[0] || { totalBookings: 0, totalRevenue: 0 };
    const monthly = stats[0]?.monthlyRevenue[0] || { total: 0 };

    const statusCounts: Record<string, number> = {};
    stats[0]?.byStatus?.forEach((s: any) => {
      statusCounts[s._id] = s.count;
    });

    return {
      totalBookings: counts.totalBookings,
      pendingBookings: statusCounts.pending || 0,
      confirmedBookings: statusCounts.confirmed || 0,
      activeBookings:
        (statusCounts.processing || 0) +
        (statusCounts.ready_for_delivery || 0) +
        (statusCounts.out_for_delivery || 0),
      completedBookings:
        (statusCounts.completed || 0) +
        (statusCounts.delivered || 0) +
        (statusCounts.collected || 0),
      cancelledBookings: statusCounts.cancelled || 0,
      totalRevenue: counts.totalRevenue,
      monthlyRevenue: monthly.total,
      pendingPaymentAmount: 0, // You can add logic for this
      averageBookingValue:
        counts.totalBookings > 0
          ? counts.totalRevenue / counts.totalBookings
          : 0,
    };
  }
}

export default BookingService;
