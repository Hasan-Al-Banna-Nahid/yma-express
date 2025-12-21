import mongoose, { Schema, Document, Model } from "mongoose";
import {
  IBooking,
  IBookingItem,
  IShippingAddress,
  IPaymentDetails,
  IBookingStatusHistory,
  BookingStatus,
  InvoiceType,
} from "./booking.interface";

export interface IBookingDocument extends Omit<IBooking, "_id">, Document {}
export interface IBookingModel extends Model<IBookingDocument> {
  generateBookingNumber(): Promise<string>;
  getStats(): Promise<any>;
}

const bookingItemSchema = new Schema<IBookingItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  name: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  totalDays: {
    type: Number,
    required: true,
    min: 1,
  },
  rentalType: {
    type: String,
    enum: ["daily", "weekly", "monthly"],
    default: "daily",
  },
});

const shippingAddressSchema = new Schema<IShippingAddress>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  country: { type: String, required: true, default: "United Kingdom" },
  city: { type: String, required: true },
  street: { type: String, required: true },
  zipCode: { type: String, required: true },
  apartment: String,
  companyName: String,
  locationAccessibility: {
    type: String,
    enum: ["easy", "moderate", "difficult"],
  },
  deliveryTime: String,
  collectionTime: String,
  floorType: {
    type: String,
    enum: ["ground", "first", "second", "higher"],
  },
  userType: {
    type: String,
    enum: ["personal", "business", "event"],
  },
  keepOvernight: { type: Boolean, default: false },
  hireOccasion: String,
  notes: String,
  differentBillingAddress: { type: Boolean, default: false },
  billingFirstName: String,
  billingLastName: String,
  billingStreet: String,
  billingCity: String,
  billingZipCode: String,
  billingCompanyName: String,
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
      "payment_pending",
      "payment_completed",
      "processing",
      "ready_for_delivery",
      "out_for_delivery",
      "delivered",
      "ready_for_collection",
      "collected",
      "completed",
      "cancelled",
      "refunded",
    ],
    required: true,
  },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  notes: String,
});

const bookingSchema = new Schema<IBookingDocument>(
  {
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
        "payment_pending",
        "payment_completed",
        "processing",
        "ready_for_delivery",
        "out_for_delivery",
        "delivered",
        "ready_for_collection",
        "collected",
        "completed",
        "cancelled",
        "refunded",
      ],
      default: "pending",
      index: true,
    },
    statusHistory: [statusHistorySchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    subTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 0,
    },
    securityDeposit: {
      type: Number,
      default: 0,
    },
    depositPaid: {
      type: Boolean,
      default: false,
    },
    depositAmount: {
      type: Number,
      default: 0,
    },
    invoiceType: {
      type: String,
      enum: ["regular", "corporate"],
      default: "regular",
    },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      sortCode: String,
      bankName: String,
    },
    termsAccepted: {
      type: Boolean,
      required: true,
      validate: {
        validator: (v: boolean) => v === true,
        message: "You must accept the terms and conditions",
      },
    },
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
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for booking duration
bookingSchema.virtual("durationDays").get(function () {
  if (
    this.items &&
    this.items.length > 0 &&
    this.items[0].endDate &&
    this.items[0].startDate
  ) {
    const diffTime = Math.abs(
      this.items[0].endDate.getTime() - this.items[0].startDate.getTime()
    );
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Static method to generate booking number
bookingSchema.statics.generateBookingNumber =
  async function (): Promise<string> {
    const prefix = "BK";
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, "0");

    // Find the latest booking for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastBooking = await this.findOne({
      createdAt: { $gte: today },
      bookingNumber: new RegExp(`^${prefix}${year}${month}`),
    }).sort({ bookingNumber: -1 });

    let sequence = 1;
    if (lastBooking && lastBooking.bookingNumber) {
      const lastSequence = parseInt(lastBooking.bookingNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${prefix}${year}${month}${sequence.toString().padStart(4, "0")}`;
  };

// Static method to get booking statistics
bookingSchema.statics.getStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        totalRevenue: { $sum: "$totalAmount" },
        averageBookingValue: { $avg: "$totalAmount" },
      },
    },
  ]);

  return (
    stats[0] || {
      totalBookings: 0,
      totalRevenue: 0,
      averageBookingValue: 0,
    }
  );
};

// Indexes for performance
bookingSchema.index({ bookingNumber: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ "payment.status": 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ "items.startDate": 1, "items.endDate": 1 });
bookingSchema.index({ totalAmount: 1 });

// Pre-save middleware to update status history
bookingSchema.pre("save", function (next) {
  if (this.isModified("status") && this.statusHistory) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      changedBy: this.user,
      notes: "Status updated",
    });
  }
  next();
});

const Booking = mongoose.model<IBookingDocument, IBookingModel>(
  "Booking",
  bookingSchema
);
export default Booking;
