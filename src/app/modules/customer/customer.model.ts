import mongoose, { Schema } from "mongoose";
import { ICustomer } from "./customer.interface";

const customerSchema = new Schema<ICustomer>(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      default: () =>
        `CUST-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },
    address: String,
    city: String,
    postcode: String,
    country: String,

    orders: [
      {
        type: Schema.Types.ObjectId,
        ref: "Order",
      },
    ],

    totalOrders: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    firstOrderDate: Date,
    lastOrderDate: Date,
    averageOrderValue: Number,

    customerType: {
      type: String,
      enum: ["retail", "corporate", "guest"],
      default: "guest",
    },
    isFavorite: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
    notes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual
customerSchema.virtual("orderCount").get(function () {
  return this.totalOrders || this.orders?.length || 0;
});

// Auto-update counters & dates
customerSchema.pre("save", function (next) {
  if (this.isModified("orders")) {
    this.totalOrders = this.orders.length;
    this.lastOrderDate = new Date();
    if (!this.firstOrderDate && this.orders.length > 0) {
      this.firstOrderDate = new Date();
    }
    // Optional: recalculate average (simple version)
    if (this.totalOrders > 0 && this.totalSpent > 0) {
      this.averageOrderValue = Math.round(this.totalSpent / this.totalOrders);
    }
  }
  next();
});
// Add this virtual to your customerSchema
customerSchema.virtual("allOrders", {
  ref: "Order",
  localField: "user", // Match the 'user' field in Customer
  foreignField: "user", // With the 'user' field in Order
});
customerSchema.virtual("orderHistory", {
  ref: "Order",
  localField: "user",
  foreignField: "user",
});
export default mongoose.model<ICustomer>("Customer", customerSchema);
