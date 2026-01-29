import mongoose, { Schema } from "mongoose";
import {
  ILocation,
  IDeliveryArea,
  IDeliveryOptions,
} from "./location.interface";

/* ---------------------------------- */
/* DELIVERY AREA SUB-SCHEMA            */
/* ---------------------------------- */
const DeliveryAreaSchema = new Schema<IDeliveryArea>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    postcode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    deliveryFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    minOrder: {
      type: Number,
      min: 0,
      default: 0,
    },
    estimatedTime: {
      type: Number,
      min: 0,
      default: 60,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true },
);

/* ---------------------------------- */
/* DELIVERY OPTIONS SUB-SCHEMA         */
/* ---------------------------------- */
const DeliveryOptionsSchema = new Schema<IDeliveryOptions>(
  {
    isAvailable: { type: Boolean, default: true },
    isFree: { type: Boolean, default: false },
    fee: { type: Number, min: 0, default: 0 },
    minOrder: { type: Number, min: 0, default: 0 },
    estimatedTime: { type: Number, min: 0, default: 60 },
    radius: { type: Number, min: 0, default: 5000 },
  },
  { _id: false },
);

/* ---------------------------------- */
/* LOCATION SCHEMA (SIMPLIFIED)       */
/* ---------------------------------- */
const LocationSchema = new Schema<ILocation>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    postcode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    country: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
      default: "",
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
    parent: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    children: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

/* ---------------------------------- */
/* UNIQUE INDEX (name + postcode)     */
/* ---------------------------------- */
LocationSchema.index({ name: 1, postcode: 1 }, { unique: true });

/* ---------------------------------- */
/* DELIVERY AREA INDEXES              */
/* ---------------------------------- */
LocationSchema.index({ "deliveryAreas.postcode": 1 });
LocationSchema.index({ "deliveryAreas.isActive": 1 });

export const LocationModel = mongoose.model<ILocation>(
  "Location",
  LocationSchema,
);
