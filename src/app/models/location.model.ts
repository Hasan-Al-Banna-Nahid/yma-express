// src/models/location.model.ts
import mongoose, { Document, Schema } from "mongoose";
import { ILocation } from "../interfaces/location.interface";

export interface ILocationModel extends ILocation, Document {}

const locationSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "A location must have a name"],
      trim: true,
      maxlength: [
        100,
        "A location name must have less or equal than 100 characters",
      ],
    },
    type: {
      type: String,
      required: [true, "A location must have a type"],
      enum: {
        values: ["country", "state", "city", "landmark"],
        message: "Location type is either: country, state, city, or landmark",
      },
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    country: {
      type: String,
      required: [true, "A location must have a country"],
      default: "England",
    },
    state: {
      type: String,
      required: function (this: ILocationModel) {
        return this.type === "city" || this.type === "landmark";
      },
    },
    city: {
      type: String,
      required: function (this: ILocationModel) {
        return this.type === "landmark";
      },
    },
    fullAddress: {
      type: String,
      required: [true, "A location must have a full address"],
      trim: true,
    },
    coordinates: {
      lat: {
        type: Number,
        required: [true, "A location must have latitude coordinates"],
        min: -90,
        max: 90,
      },
      lng: {
        type: Number,
        required: [true, "A location must have longitude coordinates"],
        min: -180,
        max: 180,
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
locationSchema.index({ type: 1 });
locationSchema.index({ country: 1, state: 1, city: 1 });
locationSchema.index({ coordinates: "2dsphere" });
locationSchema.index({ isActive: 1 });
locationSchema.index({ name: "text", fullAddress: "text" });

// Virtual for child locations
locationSchema.virtual("children", {
  ref: "Location",
  foreignField: "parent",
  localField: "_id",
});

// Virtual for getting hierarchy
locationSchema.virtual("hierarchy").get(function (this: ILocationModel) {
  return {
    country: this.country,
    state: this.state,
    city: this.city,
    landmark: this.type === "landmark" ? this.name : null,
  };
});

const Location = mongoose.model<ILocationModel>("Location", locationSchema);

export default Location;
