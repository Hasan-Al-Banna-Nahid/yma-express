// src/models/booking.model.ts
import mongoose, { Document, Schema } from "mongoose";
import { IBooking } from "../interfaces/booking.interface";

export interface IBookingModel extends IBooking, Document {}

const AddressSchema = new Schema(
  {
    fullName: { type: String, required: [true, "Full name is required"] },
    line1: { type: String, required: [true, "Address line 1 is required"] },
    line2: { type: String },
    city: { type: String, required: [true, "City is required"] },
    state: { type: String },
    postalCode: { type: String, required: [true, "Postal code is required"] },
    country: { type: String, required: [true, "Country is required"] },
    phone: { type: String },
  },
  { _id: false }
);

const bookingSchema: Schema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Booking must belong to a product"],
    },
    user: {
      type: Schema.Types.ObjectId,
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
bookingSchema.index({ product: 1 });
bookingSchema.index({ user: 1 });
bookingSchema.index({ startDate: 1, endDate: 1 });
bookingSchema.index({ status: 1 }); // often filtered

// Auto-populate product & user
bookingSchema.pre(/^find/, function (this: mongoose.Query<any, any>, next) {
  this.populate("product").populate({
    path: "user",
    select: "_id name email photo",
  });
  next();
});

const Booking = mongoose.model<IBookingModel>("Booking", bookingSchema);
export default Booking;
