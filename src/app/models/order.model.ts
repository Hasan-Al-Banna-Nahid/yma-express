// src/models/order.model.ts
import mongoose, { Schema, Model } from "mongoose";
import { IOrder } from "../interfaces/order.interface";

// Use intersection type instead of interface extension
export type IOrderModel = IOrder & mongoose.Document;

const orderItemSchema: Schema = new Schema({
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

const shippingAddressSchema: Schema = new Schema({
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
  keepOvernight: { type: Boolean, default: false },
  hireOccasion: { type: String },
  notes: { type: String },

  // Billing Address
  differentBillingAddress: { type: Boolean, default: false },
  billingFirstName: { type: String },
  billingLastName: { type: String },
  billingStreet: { type: String },
  billingCity: { type: String },
  billingState: { type: String },
  billingZipCode: { type: String },
  billingCompanyName: { type: String },
});

const bankDetailsSchema: Schema = new Schema({
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  accountHolder: { type: String, required: true },
  iban: { type: String },
  swiftCode: { type: String },
});

const orderSchema: Schema = new Schema(
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
    },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "online"],
      default: "cash_on_delivery",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    orderNumber: {
      type: String,
      unique: true,
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
      validate: {
        validator: function (value: boolean): boolean {
          return value === true;
        },
        message: "You must accept the terms and conditions",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Generate order number before saving - FIXED: Remove TypeScript typing from 'this'
orderSchema.pre("save", async function (next) {
  // Don't use TypeScript typing for 'this' in middleware
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    try {
      // Find the last order number for today
      const OrderModel = mongoose.model("Order");
      const lastOrder = await OrderModel.findOne({
        orderNumber: new RegExp(`^YMABC-${year}${month}${day}`),
      }).sort({ orderNumber: -1 });

      let sequence = 1;
      if (lastOrder && lastOrder.orderNumber) {
        const lastSeq = parseInt(lastOrder.orderNumber.split("-")[2]) || 0;
        sequence = lastSeq + 1;
      }

      this.orderNumber = `YMABC-${year}${month}${day}-${String(
        sequence
      ).padStart(4, "0")}`;
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

// FIXED: Use proper model typing
const Order = mongoose.model<IOrderModel>("Order", orderSchema);

export default Order;
