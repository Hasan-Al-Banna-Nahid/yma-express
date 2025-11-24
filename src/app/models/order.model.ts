// src/models/order.model.ts
import mongoose, { Schema, Document } from "mongoose";
import {
  IOrder,
  IOrderItem,
  IShippingAddress,
  IBankDetails,
} from "../interfaces/order.interface";

export interface IOrderModel extends IOrder, Document {}

const orderItemSchema = new Schema<IOrderItem>({
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
  },
  endDate: {
    type: Date,
  },
});

const shippingAddressSchema = new Schema<IShippingAddress>({
  // Personal Information
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },

  // Location Information
  country: { type: String, required: true },
  state: { type: String, required: true },
  city: { type: String, required: true },
  street: { type: String, required: true },
  zipCode: { type: String, required: true },

  // Additional Fields
  apartment: { type: String },
  companyName: { type: String },
  locationAccessibility: { type: String },
  deliveryTime: { type: String },
  collectionTime: { type: String },
  floorType: { type: String },
  userType: { type: String },
  keepOvernight: { type: Boolean },
  hireOccasion: { type: String },
  notes: { type: String },

  // Billing Address
  differentBillingAddress: { type: Boolean },
  billingFirstName: { type: String },
  billingLastName: { type: String },
  billingStreet: { type: String },
  billingCity: { type: String },
  billingState: { type: String },
  billingZipCode: { type: String },
  billingCompanyName: { type: String },
});

// Simplified Bank Details Schema
const bankDetailsSchema = new Schema<IBankDetails>({
  bankInfo: {
    type: String,
    required: function (this: any) {
      return this.invoiceType === "corporate";
    },
  },
});

const orderSchema = new Schema<IOrderModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "online"],
      default: "cash_on_delivery",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    estimatedDeliveryDate: {
      type: Date,
      required: true,
    },
    deliveryDate: {
      type: Date,
    },
    invoiceType: {
      type: String,
      enum: ["regular", "corporate"],
      default: "regular",
    },
    bankDetails: bankDetailsSchema,
    shippingAddress: shippingAddressSchema,
    termsAccepted: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate order number before saving - FIXED VERSION
orderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const timestamp = date.getTime();
    const random = Math.floor(Math.random() * 1000);
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
  next();
});

// Alternative: Generate order number on validation (more reliable)
orderSchema.pre("validate", function (next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const timestamp = date.getTime();
    const random = Math.floor(Math.random() * 1000);
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
  next();
});

export default mongoose.model<IOrderModel>("Order", orderSchema);
