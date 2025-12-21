import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import ApiError from "../../utils/apiError";
import { ApiResponse } from "../../utils/apiResponse";
import BookingService from "./booking.service";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { BookingFilter } from "./booking.interface";
import mongoose from "mongoose";

/**
 * @desc    Create booking from cart
 * @route   POST /api/v1/bookings
 * @access  Private
 */
export const createBooking = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user._id;

    const {
      shippingAddress,
      paymentMethod,
      termsAccepted,
      invoiceType,
      bankDetails,
      customerNotes,
    } = req.body;

    // Validate required fields
    if (!shippingAddress) {
      throw new ApiError("Shipping address is required", 400);
    }

    if (!paymentMethod) {
      throw new ApiError("Payment method is required", 400);
    }

    if (!termsAccepted) {
      throw new ApiError("You must accept terms & conditions", 400);
    }

    const booking = await BookingService.createBookingFromCart(userId, {
      shippingAddress,
      paymentMethod,
      termsAccepted,
      invoiceType,
      bankDetails,
      customerNotes,
    });

    ApiResponse(res, 201, "Booking created successfully", { booking });
  }
);

/**
 * @desc    Get user's bookings
 * @route   GET /api/v1/bookings/my-bookings
 * @access  Private
 */
export const getMyBookings = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user._id;
    const bookings = await BookingService.getUserBookings(userId.toString());

    ApiResponse(res, 200, "Bookings retrieved successfully", { bookings });
  }
);

/**
 * @desc    Get booking by ID
 * @route   GET /api/v1/bookings/:id
 * @access  Private
 */
export const getBookingById = asyncHandler(
  async (req: Request, res: Response) => {
    const bookingId = req.params.id;
    const userId = (req as AuthenticatedRequest).user._id;
    const userRole = (req as AuthenticatedRequest).user.role;

    const booking = await BookingService.getBookingById(bookingId);

    // Check ownership (unless admin)
    if (userRole !== "admin" && userRole !== "superadmin") {
      if (booking.user._id.toString() !== userId.toString()) {
        throw new ApiError("You can only view your own bookings", 403);
      }
    }

    ApiResponse(res, 200, "Booking retrieved successfully", { booking });
  }
);

/**
 * @desc    Cancel booking
 * @route   POST /api/v1/bookings/:id/cancel
 * @access  Private
 */
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

/**
 * @desc    Get all bookings (Admin)
 * @route   GET /api/v1/admin/bookings
 * @access  Private/Admin
 */
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

/**
 * @desc    Update booking status (Admin)
 * @route   PATCH /api/v1/admin/bookings/:id
 * @access  Private/Admin
 */
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

/**
 * @desc    Get booking statistics (Admin)
 * @route   GET /api/v1/admin/bookings/stats
 * @access  Private/Admin
 */
export const getBookingStats = asyncHandler(
  async (req: Request, res: Response) => {
    const stats = await BookingService.getBookingStats();

    ApiResponse(res, 200, "Booking statistics retrieved", { stats });
  }
);

/**
 * @desc    Get upcoming deliveries (Admin)
 * @route   GET /api/v1/admin/bookings/upcoming-deliveries
 * @access  Private/Admin
 */
export const getUpcomingDeliveries = asyncHandler(
  async (req: Request, res: Response) => {
    const days = req.query.days ? Number(req.query.days) : 7;
    const deliveries = await BookingService.getUpcomingDeliveries(days);

    ApiResponse(res, 200, "Upcoming deliveries retrieved", { deliveries });
  }
);

/**
 * @desc    Search bookings (Admin)
 * @route   GET /api/v1/admin/bookings/search
 * @access  Private/Admin
 */
export const searchBookings = asyncHandler(
  async (req: Request, res: Response) => {
    const { q: query, page = 1, limit = 20 } = req.query;

    if (!query) {
      throw new ApiError("Search query is required", 400);
    }

    const result = await BookingService.searchBookings(
      query as string,
      Number(page),
      Number(limit)
    );

    ApiResponse(res, 200, "Search results retrieved", {
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
