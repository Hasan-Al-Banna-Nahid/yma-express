"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/booking.model.ts
const mongoose_1 = __importStar(require("mongoose"));
const AddressSchema = new mongoose_1.Schema({
    fullName: { type: String, required: [true, "Full name is required"] },
    line1: { type: String, required: [true, "Address line 1 is required"] },
    line2: { type: String },
    city: { type: String, required: [true, "City is required"] },
    state: { type: String },
    postalCode: { type: String, required: [true, "Postal code is required"] },
    country: { type: String, required: [true, "Country is required"] },
    phone: { type: String },
}, { _id: false });
const bookingSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product",
        required: [true, "Booking must belong to a product"],
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Booking must belong to a user"],
    },
    price: { type: Number, required: [true, "Booking must have a price"] },
    paid: { type: Boolean, default: true },
    status: {
        type: String,
        enum: ["pending", "confirmed", "cancelled", "completed"],
        default: "pending",
    },
    startDate: {
        type: Date,
        required: [true, "Booking must have a start date"],
    },
    endDate: { type: Date, required: [true, "Booking must have an end date"] },
    // If you still need these legacy fields, keep them. Otherwise remove later:
    // deliveryAddress: { type: String },
    deliveryTime: {
        type: String,
        required: [true, "Booking must have a delivery time"],
    },
    // NEW
    shippingAddress: { type: AddressSchema, required: false },
    billingAddress: { type: AddressSchema, required: false },
    specialRequests: String,
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes
bookingSchema.index({ product: 1 });
bookingSchema.index({ user: 1 });
bookingSchema.index({ startDate: 1, endDate: 1 });
bookingSchema.index({ status: 1 }); // often filtered
// Auto-populate product & user
bookingSchema.pre(/^find/, function (next) {
    this.populate("product").populate({
        path: "user",
        select: "_id name email photo",
    });
    next();
});
const Booking = mongoose_1.default.model("Booking", bookingSchema);
exports.default = Booking;
