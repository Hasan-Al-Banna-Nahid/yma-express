// src/services/booking.service.ts
import mongoose from "mongoose";
import ApiError from "../utils/apiError";
import Booking, { IBookingModel } from "../models/booking.model";
import { IBooking } from "../interfaces/booking.interface";
import { IAddress } from "../interfaces/address.interface";
import { normalizeIdOrThrow } from "../utils/objectId";
// import Inventory from "../models/inventory.model"; // optional if you track per-date items

type Status = IBookingModel["status"];
const isEditableStatus = (s: Status) => s === "pending" || s === "confirmed";

const getOwnerId = (b: IBookingModel): string =>
  b.user instanceof mongoose.Types.ObjectId
    ? b.user.toString()
    : b.user._id.toString();

const ensureOwnershipOrAdmin = (
  booking: IBookingModel,
  callerId: string,
  isAdmin: boolean
) => {
  const owner = getOwnerId(booking);
  if (!isAdmin && owner !== callerId) throw new ApiError("Unauthorized", 403);
};

const ensureEditable = (booking: IBookingModel) => {
  if (!isEditableStatus(booking.status)) {
    throw new ApiError(
      `Booking not editable in status '${booking.status}'`,
      409
    );
  }
};

/** Overlap: existing.start <= requested.end && existing.end >= requested.start */
async function hasOverlap(
  productId: mongoose.Types.ObjectId,
  start: Date,
  end: Date,
  excludeId?: string
): Promise<boolean> {
  const query: any = {
    product: productId,
    status: { $ne: "cancelled" },
    startDate: { $lte: end },
    endDate: { $gte: start },
  };
  if (excludeId) query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
  const conflict = await Booking.findOne(query).lean();
  return !!conflict;
}

export class BookingService {
  /** CREATE */
  static async createBooking(
    data: Omit<IBooking, "paid" | "status"> &
      Partial<
        Pick<IBooking, "shippingAddress" | "billingAddress" | "specialRequests">
      >
  ) {
    // Prevent overlaps
    if (
      await hasOverlap(
        data.product as mongoose.Types.ObjectId,
        data.startDate,
        data.endDate
      )
    ) {
      throw new ApiError(
        "Selected dates are not available for this product",
        409
      );
    }

    const booking = await Booking.create({
      ...data,
      paid: false,
      status: "pending",
    });

    // Optional: Inventory bookkeeping
    // await Inventory.updateMany(
    //   { product: data.product, date: { $gte: data.startDate, $lte: data.endDate } },
    //   { $set: { status: "booked" }, $addToSet: { bookings: booking._id } }
    // );

    return booking;
  }

  /** UPDATE (partial) */
  static async updateBooking(
    bookingId: string,
    callerUserId: string,
    payload: Partial<IBooking>,
    isAdmin = false
  ): Promise<IBookingModel> {
    const id = normalizeIdOrThrow(bookingId, "booking id");
    const booking = await Booking.findById(id);
    if (!booking) throw new ApiError("Booking not found", 404);

    ensureOwnershipOrAdmin(booking, callerUserId, isAdmin);

    // Gates for editing
    const touchesCore =
      payload.startDate ||
      payload.endDate ||
      payload.deliveryTime ||
      typeof payload.specialRequests !== "undefined" ||
      payload.shippingAddress ||
      payload.billingAddress ||
      payload.status;

    if (touchesCore) ensureEditable(booking);

    // Prevent product/user change via this endpoint
    if ((payload as any).product || (payload as any).user) {
      throw new ApiError(
        "Cannot change product/user on an existing booking",
        400
      );
    }

    // Date sanity + overlap
    const newStart = (payload.startDate as Date) || booking.startDate;
    const newEnd = (payload.endDate as Date) || booking.endDate;
    if (newEnd < newStart)
      throw new ApiError("endDate must be after startDate", 400);

    if (
      (payload.startDate || payload.endDate) &&
      (await hasOverlap(
        booking.product as mongoose.Types.ObjectId,
        newStart,
        newEnd,
        booking.id
      ))
    ) {
      throw new ApiError("Updated dates overlap with another booking", 409);
    }

    // Apply fields
    if (payload.status) booking.status = payload.status;
    if (payload.startDate) booking.startDate = payload.startDate as Date;
    if (payload.endDate) booking.endDate = payload.endDate as Date;
    if (payload.deliveryTime) booking.deliveryTime = payload.deliveryTime!;
    if (typeof payload.specialRequests !== "undefined")
      booking.specialRequests = payload.specialRequests!;
    if (payload.shippingAddress)
      booking.shippingAddress = payload.shippingAddress as IAddress;
    if (payload.billingAddress)
      booking.billingAddress = payload.billingAddress as IAddress;

    await booking.save();
    return booking;
  }

  /** DELETE */
  static async deleteBooking(
    bookingId: string,
    callerUserId: string,
    isAdmin = false
  ): Promise<void> {
    const id = normalizeIdOrThrow(bookingId, "booking id");
    const booking = await Booking.findById(id);
    if (!booking) throw new ApiError("Booking not found", 404);

    ensureOwnershipOrAdmin(booking, callerUserId, isAdmin);

    // Optional: free inventory if you track it
    // await Inventory.updateMany(
    //   { bookings: booking._id },
    //   { $set: { status: "available" }, $pull: { bookings: booking._id } }
    // );

    await booking.deleteOne();
  }

  /** Update ONLY the shipping address. */
  static async updateShippingAddress(
    bookingId: string,
    callerUserId: string,
    address: IAddress,
    isAdmin = false
  ): Promise<IBookingModel> {
    const id = normalizeIdOrThrow(bookingId, "booking id");
    const booking = await Booking.findById(id);
    if (!booking) throw new ApiError("Booking not found", 404);

    ensureOwnershipOrAdmin(booking, callerUserId, isAdmin);
    ensureEditable(booking);

    booking.shippingAddress = address;
    await booking.save();
    return booking;
  }

  /** Update ONLY the billing address. */
  static async updateBillingAddress(
    bookingId: string,
    callerUserId: string,
    address: IAddress,
    isAdmin = false
  ): Promise<IBookingModel> {
    const id = normalizeIdOrThrow(bookingId, "booking id");
    const booking = await Booking.findById(id);
    if (!booking) throw new ApiError("Booking not found", 404);

    ensureOwnershipOrAdmin(booking, callerUserId, isAdmin);
    ensureEditable(booking);

    booking.billingAddress = address;
    await booking.save();
    return booking;
  }

  /** Update BOTH addresses at once (optional helper). */
  static async updateAddresses(
    bookingId: string,
    callerUserId: string,
    options: { shippingAddress?: IAddress; billingAddress?: IAddress },
    isAdmin = false
  ): Promise<IBookingModel> {
    const id = normalizeIdOrThrow(bookingId, "booking id");
    const booking = await Booking.findById(id);
    if (!booking) throw new ApiError("Booking not found", 404);

    ensureOwnershipOrAdmin(booking, callerUserId, isAdmin);
    ensureEditable(booking);

    if (options.shippingAddress)
      booking.shippingAddress = options.shippingAddress;
    if (options.billingAddress) booking.billingAddress = options.billingAddress;

    await booking.save();
    return booking;
  }

  /** (Optional) Fetch by id after updates, etc. */
  static async getById(bookingId: string): Promise<IBookingModel | null> {
    const id = normalizeIdOrThrow(bookingId, "booking id");
    return Booking.findById(id);
  }
}
