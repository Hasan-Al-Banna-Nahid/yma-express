// booking.controller.ts
import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import ApiError from "../../utils/apiError";
import { ApiResponse } from "../../utils/apiResponse";
import BookingService from "./booking.service";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { BookingFilter } from "./booking.interface";

export const createBooking = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user._id;
    const {
      shippingAddress,
      paymentMethod,
      invoiceType,
      bankDetails,
      customerNotes,
    } = req.body;

    if (!shippingAddress || !paymentMethod) {
      throw new ApiError(
        "Shipping address and payment method are required",
        400
      );
    }

    const booking = await BookingService.createBookingFromCart(userId, {
      shippingAddress,
      paymentMethod,
      invoiceType,
      bankDetails,
      customerNotes,
    });

    ApiResponse(res, 201, "Booking created successfully", { booking });
  }
);

export const getMyBookings = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user._id;
    const result = await BookingService.getAllBookings(
      { userId: userId.toString() },
      1,
      100
    );
    ApiResponse(res, 200, "Bookings retrieved successfully", {
      bookings: result.bookings,
    });
  }
);

export const getBookingById = asyncHandler(
  async (req: Request, res: Response) => {
    const booking = await BookingService.getBookingById(req.params.id);
    ApiResponse(res, 200, "Booking retrieved successfully", { booking });
  }
);

export const cancelBooking = asyncHandler(
  async (req: Request, res: Response) => {
    const bookingId = req.params.id;
    const userId = (req as AuthenticatedRequest).user._id;
    const { reason } = req.body;

    if (!reason) {
      throw new ApiError("Cancellation reason is required", 400);
    }

    const booking = await BookingService.cancelBooking(
      bookingId,
      userId,
      reason
    );
    ApiResponse(res, 200, "Booking cancelled successfully", { booking });
  }
);

// Admin controllers
export const getAllBookings = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      status,
      startDate,
      endDate,
      userId,
      search,
      paymentStatus,
      minAmount,
      maxAmount,
      page = 1,
      limit = 20,
    } = req.query;

    const filters: BookingFilter = {};

    if (status) filters.status = status as any;
    if (userId) filters.userId = userId as string;
    if (search) filters.search = search as string;
    if (paymentStatus) filters.paymentStatus = paymentStatus as string;
    if (minAmount) filters.minAmount = Number(minAmount);
    if (maxAmount) filters.maxAmount = Number(maxAmount);

    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    // CORRECT: Use getAllBookings, not getBookingById
    const result = await BookingService.getAllBookings(
      filters,
      Number(page),
      Number(limit)
    );

    ApiResponse(res, 200, "Bookings retrieved successfully", {
      bookings: result.bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
        pages: result.pages,
      },
    });
  }
);

export const updateBookingStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const bookingId = req.params.id;
    const adminId = (req as AuthenticatedRequest).user._id;
    const updateData = req.body;

    const booking = await BookingService.updateBooking(
      bookingId,
      updateData,
      adminId
    );

    ApiResponse(res, 200, "Booking updated successfully", { booking });
  }
);

export const getBookingStats = asyncHandler(
  async (req: Request, res: Response) => {
    const stats = await BookingService.getBookingStats();
    ApiResponse(res, 200, "Booking statistics retrieved", { stats });
  }
);
