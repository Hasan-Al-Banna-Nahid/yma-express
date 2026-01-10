import mongoose, { Document, Schema } from "mongoose";
import { ILocation } from "./location.interface";

export interface ILocationModel extends ILocation, Document {}

const locationSchema: Schema = new Schema(
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
      enum: ["country", "region", "city", "area", "postcode"],
      index: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
      index: true,
    },

    // Optional location fields
    country: { type: String, trim: true },
    state: { type: String, trim: true },
    city: { type: String, trim: true },
    area: { type: String, trim: true },
    postcode: { type: String, trim: true, uppercase: true },

    // Delivery options
    deliveryOptions: {
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
        min: 0,
        default: 0,
      },
      minOrder: {
        type: Number,
        min: 0,
        default: 0,
      },
      radius: {
        type: Number,
        min: 0,
        default: 5000, // 5km default
      },
      estimatedTime: {
        type: Number,
        min: 0,
        default: 60, // 60 minutes default
      },
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
locationSchema.index({ type: 1, isActive: 1 });
locationSchema.index({ postcode: 1 });
locationSchema.index({ "deliveryOptions.isAvailable": 1 });
locationSchema.index({ name: "text", area: "text", postcode: "text" });

// Virtual for children
locationSchema.virtual("children", {
  ref: "Location",
  foreignField: "parent",
  localField: "_id",
});

// Virtual for delivery summary
locationSchema.virtual("deliverySummary").get(function (this: ILocationModel) {
  return {
    location: `${this.name} ${this.postcode ? `(${this.postcode})` : ""}`,
    deliveryAvailable: this.deliveryOptions.isAvailable,
    deliveryFee: this.deliveryOptions.isFree
      ? "Free"
      : `£${this.deliveryOptions.fee}`,
    estimatedTime: `${this.deliveryOptions.estimatedTime} mins`,
    minOrder:
      this.deliveryOptions.minOrder > 0
        ? `£${this.deliveryOptions.minOrder}`
        : "None",
  };
});

const Location = mongoose.model<ILocationModel>("Location", locationSchema);

export default Location;
