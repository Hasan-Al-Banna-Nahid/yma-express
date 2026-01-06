// src/modules/UserOrder/order.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
  startDate?: Date;
  endDate?: Date;
}

export interface IShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  deliveryTime?: string;
  notes?: string;
}

// Update IOrder interface to include all required fields
export interface IOrder extends Document {
  orderNumber: string;
  user: mongoose.Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  paymentMethod:
    | "cash_on_delivery"
    | "bank_transfer"
    | "credit_card"
    | "online";
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  totalAmount: number;
  estimatedDeliveryDate: Date;
  adminNotes?: string;
  deliveryDate?: Date;
  bankDetails?: string;
  // ADD THESE REQUIRED FIELDS:
  termsAccepted: boolean;
  invoiceType: "regular" | "corporate";
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
});

const shippingAddressSchema = new Schema<IShippingAddress>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  street: { type: String, required: true },
  apartment: { type: String },
  city: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, default: "United Kingdom" },
  deliveryTime: { type: String },
  notes: { type: String },
});

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      default: function () {
        const prefix = "YMA";
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0");
        return `${prefix}-${timestamp}-${random}`;
      },
    },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    shippingAddress: shippingAddressSchema,
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "bank_transfer", "credit_card", "online"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    totalAmount: { type: Number, required: true, min: 0 },
    estimatedDeliveryDate: { type: Date },
    adminNotes: { type: String },
    deliveryDate: { type: Date },
    bankDetails: { type: String },
    // ADD THESE TO THE SCHEMA:
    termsAccepted: {
      type: Boolean,
      required: true,
      default: false,
    },
    invoiceType: {
      type: String,
      enum: ["regular", "corporate"],
      required: true,
      default: "regular",
    },
  },
  { timestamps: true }
);

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ estimatedDeliveryDate: 1 });

// Check if model exists to prevent OverwriteModelError
const Order =
  mongoose.models.Order || mongoose.model<IOrder>("Order", orderSchema);
export default Order;
