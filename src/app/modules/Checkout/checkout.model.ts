// order.model.ts
import mongoose, { Schema, Document } from "mongoose";
import { IOrder, IOrderItem } from "./checkout.interface";

export interface IOrderItemModel extends IOrderItem, Document {}
export interface IOrderModel extends IOrder, Document {}

const orderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  name: { type: String, required: true },
  startDate: Date,
  endDate: Date,
});

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },

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

    shippingAddress: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },

      country: { type: String, required: true },
      state: { type: String, required: true },
      city: { type: String, required: true },
      street: { type: String, required: true },
      zipCode: { type: String, required: true },
      apartment: String,

      companyName: String,
      locationAccessibility: String,
      deliveryTime: String,
      collectionTime: String,
      floorType: String,
      userType: String,
      keepOvernight: { type: Boolean, default: false },
      hireOccasion: String,
      notes: String,

      differentBillingAddress: { type: Boolean, default: false },
      billingFirstName: String,
      billingLastName: String,
      billingStreet: String,
      billingCity: String,
      billingState: String,
      billingZipCode: String,
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
      default: "regular",
    },

    bankDetails: String,
  },
  { timestamps: true }
);

export default mongoose.model<IOrderModel>("Order", orderSchema);
