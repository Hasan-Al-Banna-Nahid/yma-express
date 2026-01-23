// src/models/customer.model.ts
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
      index: { unique: true },
    },
    phone: {
      type: String,
      trim: true,
      sparse: true, // allow multiple nulls
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
      unique: true, // one customer per user
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
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    firstOrderDate: Date,
    lastOrderDate: Date,
    averageOrderValue: Number,
    customerType: {
      type: String,
      enum: ["retail", "corporate", "guest"],
      default: "guest",
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    notes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for nicer output
customerSchema.virtual("orderCount").get(function () {
  return this.orders?.length || this.totalOrders || 0;
});

// Pre-save hook to maintain counters (optional – can also be done in service)
customerSchema.pre("save", function (next) {
  if (this.isModified("orders")) {
    this.totalOrders = this.orders.length;
    this.lastOrderDate = new Date();
    if (!this.firstOrderDate && this.orders.length > 0) {
      this.firstOrderDate = new Date();
    }
  }
  next();
});

export default mongoose.model<ICustomer>("Customer", customerSchema);
