import mongoose, { Schema, Model } from "mongoose";
import { IPromo, DiscountType, PromoStatus } from "./promos.interface";

const PromoSchema: Schema = new Schema(
  {
    promoName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    discountPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    discountType: {
      type: String,
      enum: Object.values(DiscountType),
      required: true,
      default: DiscountType.PERCENTAGE,
    },
    maxDiscountValue: {
      type: Number,
      min: 0,
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
    },
    usage: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalUsage: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalUsageLimit: {
      type: Number,
      min: 0,
    },
    totalDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    avgDiscountPerOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    validityPeriod: {
      from: {
        type: Date,
        required: true,
      },
      to: {
        type: Date,
        required: true,
      },
    },
    minimumOrderValue: {
      type: Number,
      min: 0,
    },
    usageLimitPerCustomer: {
      type: Number,
      min: 1,
    },
    createdOn: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: Object.values(PromoStatus),
      default: PromoStatus.ACTIVE,
    },
    availability: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Update status based on validity period
PromoSchema.pre("save", function (next) {
  const promo = this as unknown as IPromo;
  const now = new Date();

  if (promo.validityPeriod.to < now) {
    promo.status = PromoStatus.EXPIRED;
    promo.availability = false;
  } else if (
    promo.totalUsageLimit &&
    promo.totalUsage >= promo.totalUsageLimit
  ) {
    promo.status = PromoStatus.INACTIVE;
    promo.availability = false;
  }

  next();
});

// Update avg discount per order
PromoSchema.methods.updateStats = function (orderAmount: number) {
  this.totalUsage += 1;
  this.totalDiscount += this.discount;
  this.totalRevenue += orderAmount;
  this.avgDiscountPerOrder = this.totalDiscount / this.totalUsage;
};

export const Promo: Model<IPromo> = mongoose.model<IPromo>(
  "Promo",
  PromoSchema
);
