// src/modules/UserOrder/order.model.ts
import mongoose, { Schema, Document, Types } from "mongoose";

// Define interfaces locally
export interface IOrderItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;
  name: string;
  startDate?: Date;
  endDate?: Date;
  hireOccasion?: string;
  keepOvernight?: boolean;
}

export interface IShippingAddress {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  street: string;
  zipCode: string;
  apartment?: string;
  location?: string;
  companyName?: string;
  locationAccessibility?: string;
  deliveryTime?: string;
  collectionTime?: string;
  floorType?: string;
  userType?: string;
  keepOvernight?: boolean;
  hireOccasion?: string;
  notes?: string;
  differentBillingAddress?: boolean;
  billingFirstName?: string;
  billingLastName?: string;
  billingStreet?: string;
  billingCity?: string;
  billingZipCode?: string;
  billingCompanyName?: string;
}

export interface IOrder {
  user: Types.ObjectId;
  items: IOrderItem[];
  subtotalAmount: number;
  deliveryFee: number;
  overnightFee: number;
  totalAmount: number;
  paymentMethod: "cash_on_delivery" | "credit_card" | "online";
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  shippingAddress: IShippingAddress;
  termsAccepted: boolean;
  invoiceType: "regular" | "corporate";
  bankDetails?: string;
  createdAt: Date;
  updatedAt: Date;
  orderNumber?: string;
  estimatedDeliveryDate?: Date;
  // Add the missing properties from the email service errors
  deliveryDate?: Date;
  adminNotes?: string;
}

export interface IOrderItemDocument extends IOrderItem, Document {}
export interface IOrderDocument extends IOrder, Document {}

// Delivery time options
export const DELIVERY_TIME_OPTIONS = [
  { value: "8am-12pm", label: "8 AM - 12 PM (Free)", fee: 0 },
  { value: "12pm-4pm", label: "12 PM - 4 PM (£10)", fee: 10 },
  { value: "4pm-8pm", label: "4 PM - 8 PM (£10)", fee: 10 },
  { value: "after_8pm", label: "After 8 PM (£10)", fee: 10 },
] as const;

// Collection time options
export const COLLECTION_TIME_OPTIONS = [
  { value: "before_5pm", label: "Before 5 PM (Free)", fee: 0 },
  { value: "after_5pm", label: "After 5 PM (£10)", fee: 10 },
  { value: "next_day", label: "Next Day (£10)", fee: 10 },
] as const;

// Hire occasion options
export const HIRE_OCCASION_OPTIONS = [
  "birthday",
  "wedding",
  "corporate_event",
  "school_event",
  "community_event",
  "private_party",
  "other",
] as const;

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    name: { type: String, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    hireOccasion: {
      type: String,
      enum: HIRE_OCCASION_OPTIONS,
    },
    keepOvernight: { type: Boolean, default: false },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrderDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [orderItemSchema], required: true },
    subtotalAmount: { type: Number, required: true, default: 0 },
    deliveryFee: { type: Number, required: true, default: 0 },
    overnightFee: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "credit_card", "online"],
      default: "cash_on_delivery",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
      required: true,
    },
    shippingAddress: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
      country: { type: String, required: true },
      city: { type: String, required: true },
      street: { type: String, required: true },
      zipCode: { type: String, required: true },
      apartment: { type: String },
      location: { type: String },
      companyName: { type: String },
      locationAccessibility: { type: String },
      deliveryTime: {
        type: String,
        enum: DELIVERY_TIME_OPTIONS.map((opt) => opt.value),
      },
      collectionTime: {
        type: String,
        enum: COLLECTION_TIME_OPTIONS.map((opt) => opt.value),
      },
      floorType: { type: String },
      userType: { type: String },
      keepOvernight: { type: Boolean, default: false },
      hireOccasion: {
        type: String,
        enum: HIRE_OCCASION_OPTIONS,
      },
      notes: { type: String },
      differentBillingAddress: { type: Boolean, default: false },
      billingFirstName: { type: String },
      billingLastName: { type: String },
      billingStreet: { type: String },
      billingCity: { type: String },
      billingZipCode: { type: String },
      billingCompanyName: { type: String },
    },
    termsAccepted: {
      type: Boolean,
      required: true,
      validate: {
        validator: (v: boolean) => v === true,
        message: "You must accept the terms and conditions",
      },
    },
    invoiceType: {
      type: String,
      enum: ["regular", "corporate"],
      default: "regular",
      required: true,
    },
    bankDetails: { type: String },
    orderNumber: { type: String, unique: true },
    estimatedDeliveryDate: { type: Date },
    // Add the missing properties
    deliveryDate: { type: Date },
    adminNotes: { type: String },
  },
  { timestamps: true }
);

// Pre-save middleware to generate order number
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.orderNumber = `ORD${year}${month}${day}${random}`;
  }
  next();
});

// Calculate total amount before save
orderSchema.pre("save", function (next) {
  const order = this as IOrderDocument;
  order.totalAmount =
    order.subtotalAmount + order.deliveryFee + order.overnightFee;
  next();
});

// Check if model already exists to avoid overwrite error
if (mongoose.models.Order) {
  delete mongoose.models.Order;
}

export const Order = mongoose.model<IOrderDocument>("Order", orderSchema);
export default Order;