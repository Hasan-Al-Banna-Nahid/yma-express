import mongoose, { Schema, Model } from "mongoose";
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
    customerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Customer email is required"],
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email"],
    },
    phone: {
      type: String,
      required: [true, "Customer phone is required"],
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
      uppercase: true,
      index: true,
    },
    country: {
      type: String,
      default: "UK",
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    customerType: {
      type: String,
      enum: ["retail", "corporate"],
      default: "retail",
      index: true,
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
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
      transform: (_doc, ret) => {
        delete ret._id;
        delete (ret as any).__v;
        return ret;
      },
    },
  },
);

// Indexes for better query performance
customerSchema.index({ name: "text", email: "text", phone: "text" });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ totalOrders: -1 });
customerSchema.index({ totalSpent: -1 });
customerSchema.index({ lastOrderDate: -1 });
customerSchema.index({ customerType: 1, isFavorite: 1 });

// Virtual for full address
customerSchema.virtual("fullAddress").get(function (this: ICustomer) {
  const parts = [];
  if (this.address) parts.push(this.address);
  if (this.city) parts.push(this.city);
  if (this.postcode) parts.push(this.postcode);
  if (this.country && this.country !== "UK") parts.push(this.country);
  return parts.join(", ");
});

// Pre-save middleware to generate customerId
customerSchema.pre("save", async function (next) {
  if (!this.customerId) {
    const CustomerModel = this.constructor as Model<ICustomer>;
    const count = await CustomerModel.countDocuments();
    this.customerId = `CUST${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

// Static methods
customerSchema.statics.findByEmail = async function (email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

customerSchema.statics.findByPhone = async function (phone: string) {
  return this.findOne({ phone });
};

customerSchema.statics.searchCustomers = async function (
  searchTerm: string,
  page: number = 1,
  limit: number = 20,
) {
  const skip = (page - 1) * limit;

  return this.aggregate([
    {
      $match: {
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { email: { $regex: searchTerm, $options: "i" } },
          { phone: { $regex: searchTerm, $options: "i" } },
          { customerId: { $regex: searchTerm, $options: "i" } },
        ],
      },
    },
    {
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        total: [{ $count: "count" }],
      },
    },
  ]);
};

const Customer: Model<ICustomer> =
  mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", customerSchema);

export default Customer;
