import mongoose, { Schema } from "mongoose";
import {
  ILocation,
  IDeliveryArea,
  IDeliveryOptions,
} from "./location.interface";

// Sub-schema for delivery areas
const DeliveryAreaSchema = new Schema<IDeliveryArea>(
  {
    name: {
      type: String,
      required: [true, "Delivery area name is required"],
      trim: true,
      maxlength: [100, "Area name cannot exceed 100 characters"],
    },
    postcode: {
      type: String,
      required: [true, "Postcode is required"],
      trim: true,
      uppercase: true,
    },
    deliveryFee: {
      type: Number,
      required: [true, "Delivery fee is required"],
      min: [0, "Delivery fee cannot be negative"],
      default: 0,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    minOrder: {
      type: Number,
      required: [true, "Minimum order is required"],
      min: [0, "Minimum order cannot be negative"],
      default: 0,
    },
    estimatedTime: {
      type: Number,
      required: [true, "Estimated delivery time is required"],
      min: [0, "Estimated time cannot be negative"],
      default: 60,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true, timestamps: false }
);

// Sub-schema for delivery options
const DeliveryOptionsSchema = new Schema<IDeliveryOptions>(
  {
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    fee: {
      type: Number,
      min: [0, "Fee cannot be negative"],
      default: 0,
    },
    minOrder: {
      type: Number,
      min: [0, "Minimum order cannot be negative"],
      default: 0,
    },
    estimatedTime: {
      type: Number,
      min: [0, "Estimated time cannot be negative"],
      default: 60,
    },
    radius: {
      type: Number,
      min: [0, "Radius cannot be negative"],
      default: 5000,
    },
  },
  { _id: false, timestamps: false }
);

const LocationSchema = new Schema<ILocation>(
  {
    name: {
      type: String,
      required: [true, "Location name is required"],
      trim: true,
      maxlength: [200, "Name cannot exceed 200 characters"],
    },
    type: {
      type: String,
      required: [true, "Location type is required"],
      enum: {
        values: ["country", "state", "city", "area", "postcode"],
        message: "Type must be one of: country, state, city, area, postcode",
      },
      index: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
      index: true,
    },
    country: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    area: {
      type: String,
      trim: true,
    },
    postcode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    deliveryAreas: {
      type: [DeliveryAreaSchema],
      default: [],
    },
    deliveryOptions: {
      type: DeliveryOptionsSchema,
      default: () => ({
        isAvailable: true,
        isFree: false,
        fee: 0,
        minOrder: 0,
        estimatedTime: 60,
        radius: 5000,
      }),
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
LocationSchema.index({ type: 1, isActive: 1 });
LocationSchema.index({ state: 1, city: 1, area: 1 });
LocationSchema.index({ "deliveryAreas.postcode": 1 });
LocationSchema.index({ "deliveryAreas.isActive": 1 });

// Virtual for children locations
LocationSchema.virtual("children", {
  ref: "Location",
  foreignField: "parent",
  localField: "_id",
});

// Virtual for delivery summary
LocationSchema.virtual("deliverySummary").get(function (this: ILocation) {
  const activeAreas = this.deliveryAreas.filter((area) => area.isActive);
  const deliveryFees = activeAreas.map((area) => area.deliveryFee);

  return {
    totalAreas: this.deliveryAreas.length,
    activeAreas: activeAreas.length,
    freeDeliveryAreas: activeAreas.filter((area) => area.isFree).length,
    minDeliveryFee:
      deliveryFees.length > 0
        ? Math.min(...deliveryFees)
        : this.deliveryOptions?.fee || 0,
    maxDeliveryFee:
      deliveryFees.length > 0
        ? Math.max(...deliveryFees)
        : this.deliveryOptions?.fee || 0,
  };
});

export const LocationModel = mongoose.model<ILocation>(
  "Location",
  LocationSchema
);
