// src/models/product.model.ts
import mongoose, { Schema, Model } from "mongoose";
import { IProduct } from "../interfaces/product.interface";

export type IProductModel = IProduct & mongoose.Document;

const productSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [100, "Product name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
    },
    summary: {
      type: String,
      maxlength: [500, "Summary cannot exceed 500 characters"],
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (value: number): boolean {
          return !value || value < (this as any).price;
        },
        message: "Discount price must be below regular price",
      },
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: [1, "Duration must be at least 1 hour"],
    },
    maxGroupSize: {
      type: Number,
      required: [true, "Max group size is required"],
      min: [1, "Group size must be at least 1"],
    },
    difficulty: {
      type: String,
      required: [true, "Difficulty level is required"],
      enum: {
        values: ["easy", "medium", "difficult"],
        message: "Difficulty must be easy, medium, or difficult",
      },
    },
    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    images: [String],
    imageCover: {
      type: String,
      required: [true, "Image cover is required"],
    },
    location: {
      country: {
        type: String,
        default: "England",
        required: true,
      },
      state: {
        type: String,
        required: [true, "State is required"],
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
    },
    dimensions: {
      length: {
        type: Number,
        required: [true, "Length is required"],
        min: [1, "Length must be at least 1 foot"],
      },
      width: {
        type: Number,
        required: [true, "Width is required"],
        min: [1, "Width must be at least 1 foot"],
      },
      height: {
        type: Number,
        required: [true, "Height is required"],
        min: [1, "Height must be at least 1 foot"],
      },
    },
    availableFrom: {
      type: Date,
      required: [true, "Available from date is required"],
    },
    availableUntil: {
      type: Date,
      required: [true, "Available until date is required"],
    },
    size: {
      type: String,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for total area (length * width)
productSchema.virtual("dimensions.area").get(function (this: IProductModel) {
  return this.dimensions.length * this.dimensions.width;
});

// Virtual for formatted dimensions
productSchema
  .virtual("formattedDimensions")
  .get(function (this: IProductModel) {
    return `${this.dimensions.length}ft x ${this.dimensions.width}ft x ${this.dimensions.height}ft`;
  });

// Virtual for isActive (alias for active)
productSchema.virtual("isActive").get(function (this: IProductModel) {
  return this.active;
});

// Index for better search performance
productSchema.index({ "location.country": 1, "location.state": 1 });
productSchema.index({ price: 1 });
productSchema.index({ categories: 1 });
productSchema.index({ "dimensions.length": 1, "dimensions.width": 1 });

const Product: Model<IProductModel> = mongoose.model<IProductModel>(
  "Product",
  productSchema
);

export default Product;
