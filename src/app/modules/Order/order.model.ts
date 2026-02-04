import mongoose, { Schema } from "mongoose";
import {
  IOrderDocument,
  IOrderItem,
  IShippingAddress,
  DeliveryTimeManager,
  DELIVERY_TIME_VALUES,
  COLLECTION_TIME_VALUES,
  HIRE_OCCASION_OPTIONS,
  ORDER_STATUS,
  PAYMENT_METHODS,
  INVOICE_TYPES,
} from "./order.interface"; // ← make sure this file exports the new DeliveryTimeManager

// Order Item Schema
const orderItemSchema = new Schema<IOrderItem>(
  {
    promoId: { type: Schema.Types.ObjectId, ref: "Promo" },
    imageCover: { type: String, required: false }, // <--- ADD THIS TO SCHEMA
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
  { _id: false },
);

// Shipping Address Schema
const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    country: { type: String, required: true },
    city: { type: String, required: true },
    street: { type: String, required: true },
    zipCode: { type: String, required: true },
    apartment: { type: String, default: "" },
    location: { type: String, default: "" },
    companyName: { type: String, default: "" },
    locationAccessibility: { type: String, default: "" },

    deliveryTime: {
      type: String,
      enum: DELIVERY_TIME_VALUES,
      default: "09:00", // ← updated default to match new 30-min system
      set: function (value: string) {
        return DeliveryTimeManager.normalize(value, "delivery");
      },
      get: function (value: string) {
        return DeliveryTimeManager.formatDelivery(value);
      },
    },

    collectionTime: {
      type: String,
      enum: [...COLLECTION_TIME_VALUES, ""],
      default: "",
      set: function (value: string) {
        if (!value?.trim()) return "";
        return DeliveryTimeManager.normalize(value, "collection");
      },
      // Optional: formatted output when converting to JSON/Object
      // get: function (value: string) {
      //   return value ? DeliveryTimeManager.formatCollection(value) : "";
      // },
    },

    floorType: { type: String, default: "" },
    userType: { type: String, default: "" },
    keepOvernight: { type: Boolean, default: false },
    hireOccasion: {
      type: String,
      enum: HIRE_OCCASION_OPTIONS,
      default: HIRE_OCCASION_OPTIONS[0],
    },
    notes: { type: String, default: "" },
    differentBillingAddress: { type: Boolean, default: false },
    billingFirstName: { type: String, default: "" },
    billingLastName: { type: String, default: "" },
    billingStreet: { type: String, default: "" },
    billingCity: { type: String, default: "" },
    billingZipCode: { type: String, default: "" },
    billingCompanyName: { type: String, default: "" },
  },
  {
    _id: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);

// Main Order Schema
const orderSchema = new Schema<IOrderDocument>(
  {
    customerName: {
      type: String,
      required: [false, "Customer name is required for the order record"],
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: { type: [orderItemSchema], required: true },
    subtotalAmount: { type: Number, required: true, default: 0 },
    deliveryFee: { type: Number, required: true, default: 0 },
    overnightFee: { type: Number, required: true, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      default: PAYMENT_METHODS.CASH_ON_DELIVERY,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      required: true,
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    termsAccepted: {
      type: Boolean,
      required: true,
      default: false,
    },
    invoiceType: {
      type: String,
      enum: Object.values(INVOICE_TYPES),
      default: INVOICE_TYPES.REGULAR,
      required: true,
    },
    bankDetails: { type: String, default: "" },
    promoCode: { type: String },
    promoDiscount: { type: Number, default: 0 },
    orderNumber: { type: String, unique: true },
    estimatedDeliveryDate: { type: Date },
    deliveryDate: { type: Date },
    adminNotes: { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      getters: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete (ret as any).__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      getters: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete (ret as any).__v;
        return ret;
      },
    },
  },
);

// ==================== PRE-SAVE MIDDLEWARE ====================
orderSchema.pre("save", function (next) {
  // Generate order number if not set
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.orderNumber = `ORD${year}${month}${day}${random}`;
  }

  // ─── Calculate delivery + collection fee ─────────────────────────────
  let deliveryFee = 0;
  let collectionFee = 0;

  if (this.shippingAddress?.deliveryTime) {
    deliveryFee = DeliveryTimeManager.getDeliveryFee(
      this.shippingAddress.deliveryTime,
    );
  }

  if (
    this.shippingAddress?.collectionTime &&
    this.shippingAddress.collectionTime.trim() !== ""
  ) {
    collectionFee = DeliveryTimeManager.getCollectionFee(
      this.shippingAddress.collectionTime,
    );
  }

  this.deliveryFee = deliveryFee + collectionFee;

  // Total calculation (overnightFee should already be set elsewhere or here)
  this.totalAmount =
    this.subtotalAmount +
    this.deliveryFee +
    this.overnightFee -
    this.discountAmount;

  next();
});

// ==================== MODEL EXPORT ====================
const Order =
  mongoose.models.Order || mongoose.model<IOrderDocument>("Order", orderSchema);

export default Order;
