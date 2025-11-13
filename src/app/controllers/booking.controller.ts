// src/controllers/booking.controller.ts
import { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import ApiError from "../utils/apiError";
import { IUser } from "../interfaces/user.interface";
import { IAddress } from "../interfaces/address.interface";
import Booking from "../models/booking.model";
import { BookingService } from "../services/booking.service";
import { toObjectId, normalizeIdOrThrow } from "../utils/objectId";

// ----- Types -----
type Role = "user" | "admin";
type AuthenticatedRequest = Request & {
  user: IUser & { id: string; role: Role };
};

// ----- Guards / Utils -----
function ensureAuth(req: Request): asserts req is AuthenticatedRequest {
  const aReq = req as AuthenticatedRequest;
  if (!aReq.user || !aReq.user.id)
    throw new ApiError("User not authenticated", 401);
}

function parseISODate(value: any, field: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ApiError(`Invalid ${field}`, 400);
  return d;
}

// Safely get the owner's id whether booking.user is ObjectId or a populated doc
function bookingOwnerId(booking: {
  user: Types.ObjectId | { _id: Types.ObjectId };
}): string {
  const u: any = booking.user;
  if (u && typeof u === "object" && u._id)
    return (u._id as Types.ObjectId).toString();
  return (u as Types.ObjectId).toString();
}

/** POST /api/bookings */
export const createBookingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    ensureAuth(req);
    const {
      product,
      price,
      startDate,
      endDate,
      deliveryTime,
      specialRequests,
      shippingAddress,
      billingAddress,
    } = req.body;

    if (!product) throw new ApiError("product is required", 400);
    if (price === undefined || price === null)
      throw new ApiError("price is required", 400);
    if (!startDate) throw new ApiError("startDate is required", 400);
    if (!endDate) throw new ApiError("endDate is required", 400);
    if (!deliveryTime) throw new ApiError("deliveryTime is required", 400);

    const productId = toObjectId(product, "product");
    const userId = toObjectId((req as any).user.id, "user");

    const start = parseISODate(startDate, "startDate");
    const end = parseISODate(endDate, "endDate");
    if (end < start) throw new ApiError("endDate must be after startDate", 400);

    const booking = await BookingService.createBooking({
      product: productId,
      user: userId,
      price,
      startDate: start,
      endDate: end,
      deliveryTime,
      specialRequests,
      shippingAddress,
      billingAddress,
    });

    res.status(201).json({ status: "success", data: { booking } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/bookings/:id */
export const getBookingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    ensureAuth(req);
    const id = normalizeIdOrThrow(req.params.id, "booking id");

    const booking = await Booking.findById(id);
    if (!booking) throw new ApiError("Booking not found", 404);

    const ownerId = bookingOwnerId(booking);
    if (ownerId !== req.user.id && req.user.role !== "admin") {
      throw new ApiError("Unauthorized", 403);
    }

    res.status(200).json({ status: "success", data: { booking } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/bookings */
export const getBookingsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    ensureAuth(req);
    const filter = req.user.role === "admin" ? {} : { user: req.user.id };
    const bookings = await Booking.find(filter as any);

    res.status(200).json({
      status: "success",
      results: bookings.length,
      data: { bookings },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/bookings/date-range?startDate=...&endDate=... */
export const getBookingsByDateRangeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    ensureAuth(req);
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate)
      throw new ApiError("startDate and endDate are required", 400);

    const start = parseISODate(startDate, "startDate");
    const end = parseISODate(endDate, "endDate");
    if (end < start) throw new ApiError("endDate must be after startDate", 400);

    const base: any = { startDate: { $lte: end }, endDate: { $gte: start } };
    if (req.user.role !== "admin") base.user = req.user.id;

    const bookings = await Booking.find(base);
    res.status(200).json({
      status: "success",
      results: bookings.length,
      data: { bookings },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/bookings/product/:productId */
export const getBookingsByProductHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    ensureAuth(req);
    const productObjId = toObjectId(req.params.productId, "productId");

    const filter: any = { product: productObjId };
    if (req.user.role !== "admin") filter.user = req.user.id;

    const bookings = await Booking.find(filter);
    res.status(200).json({
      status: "success",
      results: bookings.length,
      data: { bookings },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/bookings/check-availability?productId=...&startDate=...&endDate=... */
export const checkAvailabilityHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productId, startDate, endDate } = req.query;
    const productObjId = toObjectId(productId, "productId");
    if (!startDate || !endDate)
      throw new ApiError("startDate and endDate are required", 400);

    const start = parseISODate(startDate, "startDate");
    const end = parseISODate(endDate, "endDate");
    if (end < start) throw new ApiError("endDate must be after startDate", 400);

    const conflict = await Booking.findOne({
      product: productObjId,
      status: { $ne: "cancelled" },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    res.status(200).json({
      status: "success",
      data: { available: !conflict, conflictId: conflict?._id ?? null },
    });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/bookings/:id */
export const updateBookingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    ensureAuth(req);
    const id = normalizeIdOrThrow(req.params.id, "booking id");

    const payload: any = { ...req.body };
    if (payload.startDate)
      payload.startDate = parseISODate(payload.startDate, "startDate");
    if (payload.endDate)
      payload.endDate = parseISODate(payload.endDate, "endDate");
    if (
      payload.startDate &&
      payload.endDate &&
      payload.endDate < payload.startDate
    ) {
      throw new ApiError("endDate must be after startDate", 400);
    }

    const updated = await BookingService.updateBooking(
      id,
      req.user.id,
      payload,
      req.user.role === "admin"
    );

    res.status(200).json({ status: "success", data: { booking: updated } });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/bookings/:id */
export const deleteBookingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    ensureAuth(req);
    const id = normalizeIdOrThrow(req.params.id, "booking id");

    await BookingService.deleteBooking(
      id,
      req.user.id,
      req.user.role === "admin"
    );
    res.status(204).json({ status: "success", data: null });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/bookings/:id/shipping-address */
export const updateShippingAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    ensureAuth(req);
    const bookingId = normalizeIdOrThrow(req.params.id, "booking id");

    const address = req.body as IAddress;
    const updated = await BookingService.updateShippingAddress(
      bookingId,
      req.user.id,
      address,
      req.user.role === "admin"
    );
    res.status(200).json({ status: "success", data: { booking: updated } });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/bookings/:id/billing-address */
export const updateBillingAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    ensureAuth(req);
    const bookingId = normalizeIdOrThrow(req.params.id, "booking id");

    const address = req.body as IAddress;
    const updated = await BookingService.updateBillingAddress(
      bookingId,
      req.user.id,
      address,
      req.user.role === "admin"
    );
    res.status(200).json({ status: "success", data: { booking: updated } });
  } catch (err) {
    next(err);
  }
};
