"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBillingAddress = exports.updateShippingAddress = exports.deleteBookingHandler = exports.updateBookingHandler = exports.checkAvailabilityHandler = exports.getBookingsByProductHandler = exports.getBookingsByDateRangeHandler = exports.getBookingsHandler = exports.getBookingHandler = exports.createBookingHandler = void 0;
const apiError_1 = __importDefault(require("../utils/apiError"));
const booking_model_1 = __importDefault(require("../models/booking.model"));
const booking_service_1 = require("../services/booking.service");
const objectId_1 = require("../utils/objectId");
// ----- Guards / Utils -----
function ensureAuth(req) {
    const aReq = req;
    if (!aReq.user || !aReq.user.id)
        throw new apiError_1.default("User not authenticated", 401);
}
function parseISODate(value, field) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime()))
        throw new apiError_1.default(`Invalid ${field}`, 400);
    return d;
}
// Safely get the owner's id whether booking.user is ObjectId or a populated doc
function bookingOwnerId(booking) {
    const u = booking.user;
    if (u && typeof u === "object" && u._id)
        return u._id.toString();
    return u.toString();
}
/** POST /api/bookings */
const createBookingHandler = async (req, res, next) => {
    try {
        ensureAuth(req);
        const { product, price, startDate, endDate, deliveryTime, specialRequests, shippingAddress, billingAddress, } = req.body;
        if (!product)
            throw new apiError_1.default("product is required", 400);
        if (price === undefined || price === null)
            throw new apiError_1.default("price is required", 400);
        if (!startDate)
            throw new apiError_1.default("startDate is required", 400);
        if (!endDate)
            throw new apiError_1.default("endDate is required", 400);
        if (!deliveryTime)
            throw new apiError_1.default("deliveryTime is required", 400);
        const productId = (0, objectId_1.toObjectId)(product, "product");
        const userId = (0, objectId_1.toObjectId)(req.user.id, "user");
        const start = parseISODate(startDate, "startDate");
        const end = parseISODate(endDate, "endDate");
        if (end < start)
            throw new apiError_1.default("endDate must be after startDate", 400);
        const booking = await booking_service_1.BookingService.createBooking({
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
    }
    catch (err) {
        next(err);
    }
};
exports.createBookingHandler = createBookingHandler;
/** GET /api/bookings/:id */
const getBookingHandler = async (req, res, next) => {
    try {
        ensureAuth(req);
        const id = (0, objectId_1.normalizeIdOrThrow)(req.params.id, "booking id");
        const booking = await booking_model_1.default.findById(id);
        if (!booking)
            throw new apiError_1.default("Booking not found", 404);
        const ownerId = bookingOwnerId(booking);
        if (ownerId !== req.user.id && req.user.role !== "admin") {
            throw new apiError_1.default("Unauthorized", 403);
        }
        res.status(200).json({ status: "success", data: { booking } });
    }
    catch (err) {
        next(err);
    }
};
exports.getBookingHandler = getBookingHandler;
/** GET /api/bookings */
const getBookingsHandler = async (req, res, next) => {
    try {
        ensureAuth(req);
        const filter = req.user.role === "admin" ? {} : { user: req.user.id };
        const bookings = await booking_model_1.default.find(filter);
        res.status(200).json({
            status: "success",
            results: bookings.length,
            data: { bookings },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getBookingsHandler = getBookingsHandler;
/** GET /api/bookings/date-range?startDate=...&endDate=... */
const getBookingsByDateRangeHandler = async (req, res, next) => {
    try {
        ensureAuth(req);
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate)
            throw new apiError_1.default("startDate and endDate are required", 400);
        const start = parseISODate(startDate, "startDate");
        const end = parseISODate(endDate, "endDate");
        if (end < start)
            throw new apiError_1.default("endDate must be after startDate", 400);
        const base = { startDate: { $lte: end }, endDate: { $gte: start } };
        if (req.user.role !== "admin")
            base.user = req.user.id;
        const bookings = await booking_model_1.default.find(base);
        res.status(200).json({
            status: "success",
            results: bookings.length,
            data: { bookings },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getBookingsByDateRangeHandler = getBookingsByDateRangeHandler;
/** GET /api/bookings/product/:productId */
const getBookingsByProductHandler = async (req, res, next) => {
    try {
        ensureAuth(req);
        const productObjId = (0, objectId_1.toObjectId)(req.params.productId, "productId");
        const filter = { product: productObjId };
        if (req.user.role !== "admin")
            filter.user = req.user.id;
        const bookings = await booking_model_1.default.find(filter);
        res.status(200).json({
            status: "success",
            results: bookings.length,
            data: { bookings },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getBookingsByProductHandler = getBookingsByProductHandler;
/** GET /api/bookings/check-availability?productId=...&startDate=...&endDate=... */
const checkAvailabilityHandler = async (req, res, next) => {
    try {
        const { productId, startDate, endDate } = req.query;
        const productObjId = (0, objectId_1.toObjectId)(productId, "productId");
        if (!startDate || !endDate)
            throw new apiError_1.default("startDate and endDate are required", 400);
        const start = parseISODate(startDate, "startDate");
        const end = parseISODate(endDate, "endDate");
        if (end < start)
            throw new apiError_1.default("endDate must be after startDate", 400);
        const conflict = await booking_model_1.default.findOne({
            product: productObjId,
            status: { $ne: "cancelled" },
            startDate: { $lte: end },
            endDate: { $gte: start },
        });
        res.status(200).json({
            status: "success",
            data: { available: !conflict, conflictId: conflict?._id ?? null },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.checkAvailabilityHandler = checkAvailabilityHandler;
/** PATCH /api/bookings/:id */
const updateBookingHandler = async (req, res, next) => {
    try {
        ensureAuth(req);
        const id = (0, objectId_1.normalizeIdOrThrow)(req.params.id, "booking id");
        const payload = { ...req.body };
        if (payload.startDate)
            payload.startDate = parseISODate(payload.startDate, "startDate");
        if (payload.endDate)
            payload.endDate = parseISODate(payload.endDate, "endDate");
        if (payload.startDate &&
            payload.endDate &&
            payload.endDate < payload.startDate) {
            throw new apiError_1.default("endDate must be after startDate", 400);
        }
        const updated = await booking_service_1.BookingService.updateBooking(id, req.user.id, payload, req.user.role === "admin");
        res.status(200).json({ status: "success", data: { booking: updated } });
    }
    catch (err) {
        next(err);
    }
};
exports.updateBookingHandler = updateBookingHandler;
/** DELETE /api/bookings/:id */
const deleteBookingHandler = async (req, res, next) => {
    try {
        ensureAuth(req);
        const id = (0, objectId_1.normalizeIdOrThrow)(req.params.id, "booking id");
        await booking_service_1.BookingService.deleteBooking(id, req.user.id, req.user.role === "admin");
        res.status(204).json({ status: "success", data: null });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteBookingHandler = deleteBookingHandler;
/** PATCH /api/bookings/:id/shipping-address */
const updateShippingAddress = async (req, res, next) => {
    try {
        ensureAuth(req);
        const bookingId = (0, objectId_1.normalizeIdOrThrow)(req.params.id, "booking id");
        const address = req.body;
        const updated = await booking_service_1.BookingService.updateShippingAddress(bookingId, req.user.id, address, req.user.role === "admin");
        res.status(200).json({ status: "success", data: { booking: updated } });
    }
    catch (err) {
        next(err);
    }
};
exports.updateShippingAddress = updateShippingAddress;
/** PATCH /api/bookings/:id/billing-address */
const updateBillingAddress = async (req, res, next) => {
    try {
        ensureAuth(req);
        const bookingId = (0, objectId_1.normalizeIdOrThrow)(req.params.id, "booking id");
        const address = req.body;
        const updated = await booking_service_1.BookingService.updateBillingAddress(bookingId, req.user.id, address, req.user.role === "admin");
        res.status(200).json({ status: "success", data: { booking: updated } });
    }
    catch (err) {
        next(err);
    }
};
exports.updateBillingAddress = updateBillingAddress;
