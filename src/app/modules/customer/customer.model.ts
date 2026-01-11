import mongoose, { Schema, Document, Types } from "mongoose";

import { ICustomer } from "./customer.interface";

const customerSchema = new Schema<ICustomer>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
      index: true,
    },
    postcode: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    firstOrderDate: {
      type: Date,
    },
    lastOrderDate: {
      type: Date,
      index: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Indexes
customerSchema.index({ name: "text", email: "text", phone: "text" });
customerSchema.index({ totalOrders: -1, totalSpent: -1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ isFavorite: 1, lastOrderDate: -1 });

// Virtual for full address
customerSchema.virtual("fullAddress").get(function (this: ICustomer) {
  const parts = [];
  if (this.address) parts.push(this.address);
  if (this.city) parts.push(this.city);
  if (this.postcode) parts.push(this.postcode);
  return parts.join(", ");
});

// Virtual for customer orders
customerSchema.virtual("orders", {
  ref: "Order",
  localField: "user",
  foreignField: "user",
});

const Customer =
  mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", customerSchema);

export default Customer;
