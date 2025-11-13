import mongoose, { Document, Schema } from "mongoose";
import { IOrder, IOrderItem } from "../interfaces/checkout.interface";

export interface IOrderItemModel extends IOrderItem, Document {}
export interface IOrderModel extends IOrder, Document {}

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
    shippingAddress: {
      // Personal Information
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },

      // Delivery Information
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      zipCode: { type: String, required: true },
      apartment: { type: String },

      // Additional Fields
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
    },
    termsAccepted: {
      type: Boolean,
      required: true,
      validate: {
        validator: function (value: boolean) {
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

const Order = mongoose.model<IOrderModel>("Order", orderSchema);

export default Order;
