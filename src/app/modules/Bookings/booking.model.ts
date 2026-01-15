import mongoose, { Schema, Document, Model } from "mongoose";
import {
  IBooking,
  IBookingItem,
  IShippingAddress,
  IPaymentDetails,
  IBookingStatusHistory,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  InvoiceType,
  RentalType,
} from "./booking.interface";

export interface IBookingDocument extends Omit<IBooking, "_id">, Document {}
export interface IBookingModel extends Model<IBookingDocument> {
  generateBookingNumber(): Promise<string>;
}

const bookingItemSchema = new Schema<IBookingItem>({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalDays: { type: Number, required: true, min: 1 },
  rentalType: {
    type: String,
    enum: ["daily", "weekly", "monthly"],
    required: true,
  },
  warehouse: { type: String, required: true },
  vendor: { type: String, required: true },
  rentalFee: { type: Number, required: true, min: 0 },
});

const shippingAddressSchema = new Schema<IShippingAddress>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true, default: "United Kingdom" },
  notes: String,
  deliveryTime: String,
  collectionTime: String,
});

const paymentDetailsSchema = new Schema<IPaymentDetails>({
  method: {
    type: String,
    enum: ["cash_on_delivery", "bank_transfer", "card", "paypal"],
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending",
  },
  transactionId: String,
  paidAt: Date,
  amount: { type: Number, required: true },
});

const statusHistorySchema = new Schema<IBookingStatusHistory>({
  status: {
    type: String,
    enum: [
      "pending",
      "confirmed",
      "processing",
      "ready_for_delivery",
      "out_for_delivery",
      "delivered",
      "ready_for_collection",
      "collected",
      "completed",
      "cancelled",
    ],
    required: true,
  },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  notes: String,
});

const bookingSchema = new Schema<IBookingDocument>(
  {
    bookedDates: [
      {
        date: { type: Date, required: true },
        itemIndex: { type: Number, required: true }, // Index in items array
        quantity: { type: Number, required: true },
      },
    ],
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: [bookingItemSchema],
    shippingAddress: shippingAddressSchema,
    payment: paymentDetailsSchema,
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "ready_for_delivery",
        "out_for_delivery",
        "delivered",
        "ready_for_collection",
        "collected",
        "completed",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },
    statusHistory: [statusHistorySchema],
    totalAmount: { type: Number, required: true, min: 0 },
    subTotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, default: 0 },
    deliveryFee: { type: Number, required: true, default: 0 },
    collectionFee: { type: Number, required: true, default: 0 },
    securityDeposit: { type: Number, default: 0 },
    invoiceType: {
      type: String,
      enum: ["regular", "corporate"],
      default: "regular",
    },
    bankDetails: String,
    estimatedDeliveryDate: Date,
    actualDeliveryDate: Date,
    estimatedCollectionDate: Date,
    actualCollectionDate: Date,
    adminNotes: String,
    customerNotes: String,
    cancellationReason: String,
    refundAmount: Number,
    refundedAt: Date,
  },

  { timestamps: true }
);

bookingSchema.statics.generateBookingNumber =
  async function (): Promise<string> {
    const prefix = "BK";
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, "0");

    const lastBooking = await this.findOne({
      bookingNumber: new RegExp(`^${prefix}${year}${month}`),
    }).sort({ bookingNumber: -1 });

    let sequence = 1;
    if (lastBooking && lastBooking.bookingNumber) {
      const lastSequence = parseInt(lastBooking.bookingNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${prefix}${year}${month}${sequence.toString().padStart(4, "0")}`;
  };

bookingSchema.index({ bookingNumber: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ status: 1, createdAt: -1 });

const Booking = mongoose.model<IBookingDocument, IBookingModel>(
  "Booking",
  bookingSchema
);

export default Booking;
