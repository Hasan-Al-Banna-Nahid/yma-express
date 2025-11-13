"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingService = void 0;
// src/services/booking.service.ts
const mongoose_1 = __importDefault(require("mongoose"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const booking_model_1 = __importDefault(require("../models/booking.model"));
const objectId_1 = require("../utils/objectId");
const isEditableStatus = (s) => s === "pending" || s === "confirmed";
const getOwnerId = (b) => b.user instanceof mongoose_1.default.Types.ObjectId
    ? b.user.toString()
    : b.user._id.toString();
const ensureOwnershipOrAdmin = (booking, callerId, isAdmin) => {
    const owner = getOwnerId(booking);
    if (!isAdmin && owner !== callerId)
        throw new apiError_1.default("Unauthorized", 403);
};
const ensureEditable = (booking) => {
    if (!isEditableStatus(booking.status)) {
        throw new apiError_1.default(`Booking not editable in status '${booking.status}'`, 409);
    }
};
/** Overlap: existing.start <= requested.end && existing.end >= requested.start */
async function hasOverlap(productId, start, end, excludeId) {
    const query = {
        product: productId,
        status: { $ne: "cancelled" },
        startDate: { $lte: end },
        endDate: { $gte: start },
    };
    if (excludeId)
        query._id = { $ne: new mongoose_1.default.Types.ObjectId(excludeId) };
    const conflict = await booking_model_1.default.findOne(query).lean();
    return !!conflict;
}
class BookingService {
    /** CREATE */
    static async createBooking(data) {
        // Prevent overlaps
        if (await hasOverlap(data.product, data.startDate, data.endDate)) {
            throw new apiError_1.default("Selected dates are not available for this product", 409);
        }
        const booking = await booking_model_1.default.create({
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
    static async updateBooking(bookingId, callerUserId, payload, isAdmin = false) {
        const id = (0, objectId_1.normalizeIdOrThrow)(bookingId, "booking id");
        const booking = await booking_model_1.default.findById(id);
        if (!booking)
            throw new apiError_1.default("Booking not found", 404);
        ensureOwnershipOrAdmin(booking, callerUserId, isAdmin);
        // Gates for editing
        const touchesCore = payload.startDate ||
            payload.endDate ||
            payload.deliveryTime ||
            typeof payload.specialRequests !== "undefined" ||
            payload.shippingAddress ||
            payload.billingAddress ||
            payload.status;
        if (touchesCore)
            ensureEditable(booking);
        // Prevent product/user change via this endpoint
        if (payload.product || payload.user) {
            throw new apiError_1.default("Cannot change product/user on an existing booking", 400);
        }
        // Date sanity + overlap
        const newStart = payload.startDate || booking.startDate;
        const newEnd = payload.endDate || booking.endDate;
        if (newEnd < newStart)
            throw new apiError_1.default("endDate must be after startDate", 400);
        if ((payload.startDate || payload.endDate) &&
            (await hasOverlap(booking.product, newStart, newEnd, booking.id))) {
            throw new apiError_1.default("Updated dates overlap with another booking", 409);
        }
        // Apply fields
        if (payload.status)
            booking.status = payload.status;
        if (payload.startDate)
            booking.startDate = payload.startDate;
        if (payload.endDate)
            booking.endDate = payload.endDate;
        if (payload.deliveryTime)
            booking.deliveryTime = payload.deliveryTime;
        if (typeof payload.specialRequests !== "undefined")
            booking.specialRequests = payload.specialRequests;
        if (payload.shippingAddress)
            booking.shippingAddress = payload.shippingAddress;
        if (payload.billingAddress)
            booking.billingAddress = payload.billingAddress;
        await booking.save();
        return booking;
    }
    /** DELETE */
    static async deleteBooking(bookingId, callerUserId, isAdmin = false) {
        const id = (0, objectId_1.normalizeIdOrThrow)(bookingId, "booking id");
        const booking = await booking_model_1.default.findById(id);
        if (!booking)
            throw new apiError_1.default("Booking not found", 404);
        ensureOwnershipOrAdmin(booking, callerUserId, isAdmin);
        // Optional: free inventory if you track it
        // await Inventory.updateMany(
        //   { bookings: booking._id },
        //   { $set: { status: "available" }, $pull: { bookings: booking._id } }
        // );
        await booking.deleteOne();
    }
    /** Update ONLY the shipping address. */
    static async updateShippingAddress(bookingId, callerUserId, address, isAdmin = false) {
        const id = (0, objectId_1.normalizeIdOrThrow)(bookingId, "booking id");
        const booking = await booking_model_1.default.findById(id);
        if (!booking)
            throw new apiError_1.default("Booking not found", 404);
        ensureOwnershipOrAdmin(booking, callerUserId, isAdmin);
        ensureEditable(booking);
        booking.shippingAddress = address;
        await booking.save();
        return booking;
    }
    /** Update ONLY the billing address. */
    static async updateBillingAddress(bookingId, callerUserId, address, isAdmin = false) {
        const id = (0, objectId_1.normalizeIdOrThrow)(bookingId, "booking id");
        const booking = await booking_model_1.default.findById(id);
        if (!booking)
            throw new apiError_1.default("Booking not found", 404);
        ensureOwnershipOrAdmin(booking, callerUserId, isAdmin);
        ensureEditable(booking);
        booking.billingAddress = address;
        await booking.save();
        return booking;
    }
    /** Update BOTH addresses at once (optional helper). */
    static async updateAddresses(bookingId, callerUserId, options, isAdmin = false) {
        const id = (0, objectId_1.normalizeIdOrThrow)(bookingId, "booking id");
        const booking = await booking_model_1.default.findById(id);
        if (!booking)
            throw new apiError_1.default("Booking not found", 404);
        ensureOwnershipOrAdmin(booking, callerUserId, isAdmin);
        ensureEditable(booking);
        if (options.shippingAddress)
            booking.shippingAddress = options.shippingAddress;
        if (options.billingAddress)
            booking.billingAddress = options.billingAddress;
        await booking.save();
        return booking;
    }
    /** (Optional) Fetch by id after updates, etc. */
    static async getById(bookingId) {
        const id = (0, objectId_1.normalizeIdOrThrow)(bookingId, "booking id");
        return booking_model_1.default.findById(id);
    }
}
exports.BookingService = BookingService;
