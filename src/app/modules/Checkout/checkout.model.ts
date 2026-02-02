import mongoose, { Schema } from "mongoose";
import { IOrder, IOrderItem } from "./checkout.interface";

// Check if model already exists
if (mongoose.models.Order) {
  delete mongoose.models.Order;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    name: { type: String, required: true },
    startDate: { type: Date },
    imageCover: { type: String, required: false }, // <--- Add this line    endDate: { type: Date },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true, // 🔥 IMPORTANT
    },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true },
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
      deliveryTime: { type: String },
      floorType: { type: String },
      collectionTime: { type: String },
      userType: { type: String },
      keepOvernight: { type: Boolean, default: false },
      hireOccasion: { type: String },
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
  },
  { timestamps: true },
);

// Export the model
export const Order =
  mongoose.models.Order || mongoose.model<IOrder>("Order", orderSchema);
export default Order;
