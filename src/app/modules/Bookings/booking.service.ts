import mongoose, { Types } from "mongoose";
import Booking, { IBookingDocument } from "./booking.model";
import Product from "../../modules/Product/product.model";
import ApiError from "../../utils/apiError";
import {
  CreateBookingData,
  UpdateBookingData,
  BookingStats,
  BookingFilter,
  IBookingItem,
  IShippingAddress,
  IPaymentDetails,
  IBookingStatusHistory,
  PaymentMethod,
} from "./booking.interface";
import { EmailService } from "./email.service";
import Inventory from "../../modules/Inventory/inventory.model";

export class BookingService {
  static async createBooking(
    userId: Types.ObjectId,
    data: CreateBookingData,
  ): Promise<IBookingDocument> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log("🚀 [DEBUG] createBooking called");
      console.log("👤 User ID:", userId);
      console.log("📋 Items count:", data.items?.length);

      // Validation
      if (!data.items?.length) {
        console.log("❌ No items in booking");
        throw new ApiError("Booking items are required", 400);
      }

      if (!data.shippingAddress || !data.paymentMethod) {
        console.log("❌ Missing shipping address or payment method");
        throw new ApiError(
          "Shipping address and payment method are required",
          400,
        );
      }

      let subTotal = 0;
      const bookingItems: IBookingItem[] = [];
      const tempBookingId = new mongoose.Types.ObjectId();

      console.log("🆔 Temporary Booking ID:", tempBookingId);

      // Process each item
      for (const [index, item] of data.items.entries()) {
        console.log(`\n🔍 Processing item ${index + 1}:`);
        console.log("   Product ID:", item.productId);
        console.log("   Quantity:", 1);
        console.log("   Start Date:", item.startDate);
        console.log("   End Date:", item.endDate);

        const product = await Product.findById(item.productId).session(session);
        if (!product) {
          console.log(`❌ Product not found: ${item.productId}`);
          throw new ApiError(`Product not found: ${item.productId}`, 404);
        }

        console.log(`✅ Product found: ${product.name}`);

        if (!item.startDate || !item.endDate) {
          console.log("❌ Missing start or end date");
          throw new ApiError("Start date and end date are required", 400);
        }

        const startDate = new Date(item.startDate);
        const endDate = new Date(item.endDate);

        // Normalize dates
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const totalDays = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        console.log("📅 Date Analysis:");
        console.log("   Start Date (normalized):", startDate.toISOString());
        console.log("   End Date (normalized):", endDate.toISOString());
        console.log("   Total Days:", totalDays);

        if (totalDays < 1) {
          console.log("❌ Total days less than 1");
          throw new ApiError("Minimum booking is 1 day", 400);
        }

        // Check inventory availability
        console.log("🔍 Checking inventory availability...");
        const availability = await Inventory.checkAvailability(
          product._id.toString(),
          startDate,
          endDate,
          1,
        );

        console.log("📊 Availability Result:", {
          isAvailable: availability.isAvailable,
          availableQuantity: availability.availableQuantity,
          message: availability.message,
          availableItemsCount: availability.inventoryItems?.length,
        });

        if (!availability.isAvailable) {
          console.log("❌ Inventory not available");

          // Debug: Check what's actually in the inventory
          console.log("🔍 DEBUG: Checking raw inventory data...");
          const rawInventory = await Inventory.find({
            product: product._id,
          });

          console.log("📊 Raw inventory found:", rawInventory.length);
          rawInventory.forEach((inv, idx) => {
            console.log(`  Inventory ${idx + 1}:`);
            console.log(`    ID: ${inv._id}`);
            console.log(`    Status: ${inv.status}`);
            console.log(`    Quantity: ${inv.quantity}`);
            console.log(`    Warehouse: ${inv.warehouse}`);
            console.log(`    Booked Dates: ${inv.bookedDates?.length || 0}`);
          });

          throw new ApiError(
            `"${product.name}" is not available for the selected dates. ${availability.message}`,
            400,
          );
        }

        console.log("✅ Inventory available, proceeding to reserve...");

        // Reserve inventory
        const reservedItems = await Inventory.reserveInventory(
          product._id.toString(),
          startDate,
          endDate,
          1,
          tempBookingId,
        );

        console.log("✅ Reserved items:", reservedItems?.length || 0);

        if (!reservedItems || reservedItems.length === 0) {
          console.log("❌ Failed to reserve inventory");
          throw new ApiError(
            `Failed to reserve inventory for ${product.name}`,
            400,
          );
        }

        // Calculate price
        const rentalFee = product.price;
        const itemTotal = rentalFee * 1 * totalDays;
        subTotal += itemTotal;

        console.log("💰 Price Calculation:");
        console.log("   Rental Fee:", rentalFee);
        console.log("   Item Total:", itemTotal);
        console.log("   Subtotal:", subTotal);

        bookingItems.push({
          product: product._id,
          quantity: 1,
          price: rentalFee,
          name: product.name,
          startDate,
          endDate,
          totalDays,
          rentalType: item.rentalType,
          warehouse: reservedItems[0]?.warehouse || "Main Warehouse",
          vendor: reservedItems[0]?.vendor || "YMA Suppliers",
          rentalFee,
        });
      }

      // Calculate fees
      const taxAmount = 0; // No tax
      let deliveryFee = 0;
      let collectionFee = 0;

      // Delivery fee: Free for 8-12 PM, €10 otherwise
      const deliveryTime = data.shippingAddress.deliveryTime;
      if (deliveryTime) {
        const hour = parseInt(deliveryTime.split(":")[0]);
        deliveryFee = hour >= 8 && hour <= 12 ? 0 : 10;
      }

      // Collection fee: Free for 5 PM, €10 otherwise
      const collectionTime = data.shippingAddress.collectionTime;
      if (collectionTime) {
        const hour = parseInt(collectionTime.split(":")[0]);
        collectionFee = hour === 17 ? 0 : 10;
      }

      const totalAmount = subTotal + deliveryFee + collectionFee;

      console.log("💰 Fee Calculation:");
      console.log("   Delivery Fee:", deliveryFee);
      console.log("   Collection Fee:", collectionFee);
      console.log("   Total Amount:", totalAmount);

      // Generate booking number
      const bookingNumber = await Booking.generateBookingNumber();
      console.log("📝 Booking Number:", bookingNumber);

      const paymentDetails: IPaymentDetails = {
        method: data.paymentMethod,
        status: "pending",
        amount: totalAmount,
      };

      const shippingAddress: IShippingAddress = {
        firstName: data.shippingAddress.firstName,
        lastName: data.shippingAddress.lastName,
        email: data.shippingAddress.email,
        phone: data.shippingAddress.phone,
        address: data.shippingAddress.address,
        city: data.shippingAddress.city,
        postalCode: data.shippingAddress.postalCode,
        country: data.shippingAddress.country || "United Kingdom",
        notes: data.shippingAddress.notes,
        deliveryTime: data.shippingAddress.deliveryTime,
        collectionTime: data.shippingAddress.collectionTime,
      };

      const statusHistory: IBookingStatusHistory[] = [
        {
          status: "pending",
          changedAt: new Date(),
          changedBy: userId,
          notes: "Booking created",
        },
      ];

      // Collect all booked dates from all items
      const allBookedDates = [];
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const startDate = new Date(item.startDate);
        const endDate = new Date(item.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const totalDays = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        for (let day = 0; day < totalDays; day++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + day);
          allBookedDates.push({
            date: currentDate,
            itemIndex: i,
            quantity: 1,
          });
        }
      }

      const bookingData = {
        _id: tempBookingId,
        bookingNumber,
        user: userId,
        items: bookingItems,
        shippingAddress: shippingAddress,
        payment: paymentDetails,
        status: "pending" as const,
        statusHistory,
        totalAmount,
        subTotal,
        taxAmount,
        deliveryFee,
        collectionFee,
        invoiceType: data.invoiceType || "regular",
        bankDetails: data.bankDetails,
        customerNotes: data.customerNotes,
        estimatedDeliveryDate: bookingItems[0]?.startDate,
        estimatedCollectionDate: bookingItems[0]?.endDate,
        bookedDates: allBookedDates,
      };

      console.log("💾 Creating booking in database...");
      const bookingResult = await Booking.create([bookingData], { session });
      const booking = bookingResult[0];
      console.log("✅ Booking created:", booking._id);

      // Update inventory with actual booking ID
      console.log("🔄 Updating inventory with actual booking ID...");
      await Inventory.updateMany(
        { "bookedDates.bookingId": tempBookingId },
        { $set: { "bookedDates.$.bookingId": booking._id } },
      ).session(session);

      await session.commitTransaction();
      console.log("✅ Transaction committed successfully");

      const populatedBooking = await this.getBookingById(
        (booking._id as string).toString(),
      );

      console.log("📧 Sending confirmation emails...");
      // Send emails
      await EmailService.sendBookingConfirmation(populatedBooking);
      await EmailService.sendAdminNotification(
        populatedBooking,
        "New Booking Created",
      );

      console.log("✅ Booking process completed successfully!");
      return populatedBooking; // ← THIS IS THE CRITICAL RETURN STATEMENT
    } catch (error) {
      console.error("❌ Error in createBooking:", error);
      await session.abortTransaction();
      throw error;
    } finally {
      console.log("🔚 Ending session");
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
    limit: number = 20,
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
        { "shippingAddress.phone": { $regex: filters.search, $options: "i" } },
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
    adminId: Types.ObjectId,
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
        notes: updateData.adminNotes || "Status updated",
      });

      await EmailService.sendBookingStatusUpdate(booking);
    }

    if (updateData.adminNotes) booking.adminNotes = updateData.adminNotes;
    if (updateData.estimatedDeliveryDate) {
      booking.estimatedDeliveryDate = new Date(
        updateData.estimatedDeliveryDate,
      );
    }
    if (updateData.estimatedCollectionDate) {
      booking.estimatedCollectionDate = new Date(
        updateData.estimatedCollectionDate,
      );
    }

    await booking.save();
    return await this.getBookingById(bookingId);
  }

  static async cancelBooking(
    bookingId: string,
    userId: Types.ObjectId,
    reason: string,
  ): Promise<IBookingDocument> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking) {
        throw new ApiError("Booking not found", 404);
      }

      if (booking.user.toString() !== userId.toString()) {
        throw new ApiError("You can only cancel your own bookings", 403);
      }

      if (["cancelled", "completed"].includes(booking.status)) {
        throw new ApiError(`Booking is already ${booking.status}`, 400);
      }

      // Release inventory
      await Inventory.releaseInventory(bookingId);

      booking.status = "cancelled";
      booking.cancellationReason = reason;
      booking.statusHistory.push({
        status: "cancelled",
        changedAt: new Date(),
        changedBy: userId,
        notes: `Cancelled: ${reason}`,
      });

      await booking.save({ session });
      await session.commitTransaction();

      const populatedBooking = await this.getBookingById(bookingId);

      await EmailService.sendBookingStatusUpdate(populatedBooking);
      await EmailService.sendAdminNotification(
        populatedBooking,
        "Booking Cancelled",
      );

      return populatedBooking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async getBookingStats(): Promise<BookingStats> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const stats = await Booking.aggregate([
      {
        $facet: {
          counts: [
            {
              $group: {
                _id: null,
                totalBookings: { $sum: 1 },
                totalRevenue: { $sum: "$totalAmount" },
                pendingPaymentAmount: {
                  $sum: {
                    $cond: [
                      { $eq: ["$payment.status", "pending"] },
                      "$totalAmount",
                      0,
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
                createdAt: { $gte: startOfMonth },
              },
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } },
          ],
        },
      },
    ]);

    const counts = stats[0]?.counts[0] || {
      totalBookings: 0,
      totalRevenue: 0,
      pendingPaymentAmount: 0,
    };
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
      pendingPaymentAmount: counts.pendingPaymentAmount,
      averageBookingValue:
        counts.totalBookings > 0
          ? counts.totalRevenue / counts.totalBookings
          : 0,
    };
  }
  // booking.service.ts - Add these methods
  static async syncWithOrder(orderId: string): Promise<IBookingDocument> {
    try {
      // Import Order model (ensure proper path)
      const Order = require("../Order/order.model").default;

      const order = await Order.findById(orderId)
        .populate("items.product")
        .populate("user");

      if (!order) {
        throw new ApiError("Order not found", 404);
      }

      // Convert order to booking data
      const bookingData: CreateBookingData = {
        items: order.items.map((item: any) => ({
          productId: item.product._id.toString(),
          quantity: item.quantity,
          startDate: item.startDate || new Date(),
          endDate:
            item.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
          rentalType: item.rentalType || "daily",
        })),
        shippingAddress: order.shippingAddress,
        paymentMethod: order.payment.method as PaymentMethod,
        invoiceType: order.invoiceType || "regular",
        customerNotes: order.notes,
      };

      // Create booking from order
      const booking = await this.createBooking(order.user._id, bookingData);

      // Update order with booking reference
      order.booking = booking._id;
      await order.save();

      return booking;
    } catch (error) {
      console.error("Error syncing order to booking:", error);
      throw error;
    }
  }

  static async getBookingsByOrderId(
    orderId: string,
  ): Promise<IBookingDocument[]> {
    const Order = require("../Order/order.model").default;

    const orders = await Order.find({ _id: orderId })
      .populate("booking")
      .exec();

    const bookingIds = orders
      .filter((order: any) => order.booking)
      .map((order: any) => order.booking);

    return await Booking.find({ _id: { $in: bookingIds } })
      .populate("user", "name email")
      .populate("items.product", "name price")
      .exec();
  }
}

export default BookingService;
