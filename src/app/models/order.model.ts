import mongoose, { Schema, Model, Document } from "mongoose";
import {
  IOrder,
  IOrderItem,
  IShippingAddress,
  IBankDetails,
  OrderStatus,
  PaymentMethod,
  InvoiceType,
} from "../interfaces/order.interface";

// Extend IOrder with Mongoose Document
export interface IOrderModel extends IOrder, Document {
  // You can add Mongoose-specific methods here if needed
  calculateTax(): number;
  getOrderSummary(): string;
  formattedDeliveryDate: string;
  itemCount: number;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
    price: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"],
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
  },
  { _id: false }
);

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    // Personal Information
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },

    // Location Information
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    street: {
      type: String,
      required: [true, "Street address is required"],
      trim: true,
    },
    zipCode: {
      type: String,
      required: [true, "Zip code is required"],
      trim: true,
    },

    // Additional Fields
    apartment: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    locationAccessibility: {
      type: String,
      trim: true,
    },
    deliveryTime: {
      type: String,
      trim: true,
    },
    collectionTime: {
      type: String,
      trim: true,
    },
    floorType: {
      type: String,
      trim: true,
    },
    userType: {
      type: String,
      trim: true,
    },
    keepOvernight: {
      type: Boolean,
      default: false,
    },
    hireOccasion: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },

    // Billing Address
    differentBillingAddress: {
      type: Boolean,
      default: false,
    },
    billingFirstName: {
      type: String,
      trim: true,
    },
    billingLastName: {
      type: String,
      trim: true,
    },
    billingStreet: {
      type: String,
      trim: true,
    },
    billingCity: {
      type: String,
      trim: true,
    },
    billingState: {
      type: String,
      trim: true,
    },
    billingZipCode: {
      type: String,
      trim: true,
    },
    billingCompanyName: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const bankDetailsSchema = new Schema<IBankDetails>(
  {
    bankInfo: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrderModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "online"],
      required: [true, "Payment method is required"],
      default: "cash_on_delivery",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    orderNumber: {
      type: String,
      required: [true, "Order number is required"],
      unique: true,
      index: true,
    },
    estimatedDeliveryDate: {
      type: Date,
      required: [true, "Estimated delivery date is required"],
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
      required: [true, "Terms must be accepted"],
      default: false,
      validate: {
        validator: function (value: boolean) {
          return value === true;
        },
        message: "Terms must be accepted to place an order",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate order number before saving
orderSchema.pre("save", function (next) {
  if (!this.isNew || this.orderNumber) return next();

  // Generate order number: ORD-YYYYMMDD-XXXXX
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");

  this.orderNumber = `ORD-${year}${month}${day}-${random}`;
  next();
});

// Virtual for formatted delivery date
orderSchema.virtual("formattedDeliveryDate").get(function () {
  return this.estimatedDeliveryDate.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

// Virtual for item count
orderSchema.virtual("itemCount").get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Method to calculate tax (example: 10% tax)
orderSchema.method("calculateTax", function (): number {
  return this.totalAmount * 0.1; // 10% tax
});

// Method to get order summary
orderSchema.method("getOrderSummary", function (): string {
  return `Order #${
    this.orderNumber
  } - ${this.itemCount} items - Total: £${this.totalAmount.toFixed(2)}`;
});

// Indexes for better query performance
orderSchema.index({ createdAt: -1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, estimatedDeliveryDate: 1 });
orderSchema.index({ "shippingAddress.country": 1, "shippingAddress.state": 1 });

const Order: Model<IOrderModel> = mongoose.model<IOrderModel>(
  "Order",
  orderSchema
);

export default Order;
