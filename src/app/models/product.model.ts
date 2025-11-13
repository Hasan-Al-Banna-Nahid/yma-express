// src/models/product.model.ts
import mongoose, { Document, Schema } from "mongoose";
import { IProduct } from "../interfaces/product.interface";

export interface IProductModel extends IProduct, Document {}

const productSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "A product must have a name"],
      trim: true,
      maxlength: [
        100,
        "A product name must have less or equal than 100 characters",
      ],
      minlength: [
        3,
        "A product name must have more or equal than 3 characters",
      ],
    },
    description: {
      type: String,
      required: [true, "A product must have a description"],
      trim: true,
    },
    summary: {
      type: String,
      trim: true,
      maxlength: [300, "Summary must have less or equal than 300 characters"],
    },
    price: {
      type: Number,
      required: [true, "A product must have a price"],
      min: [0, "Price must be above 0"],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (this: IProductModel, value: number) {
          return !value || value < this.price;
        },
        message: "Discount price ({VALUE}) should be below the regular price",
      },
    },
    images: [String],
    imageCover: {
      type: String,
      required: [true, "A product must have a cover image"],
    },
    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: [true, "A product must belong to at least one category"],
      },
    ],
    duration: {
      type: Number,
      required: [true, "A product must have a duration"],
      min: [1, "Duration must be at least 1 hour"],
    },
    maxGroupSize: {
      type: Number,
      required: [true, "A product must have a group size"],
      min: [1, "Group size must be at least 1"],
    },
    difficulty: {
      type: String,
      required: [true, "A product must have a difficulty"],
      enum: {
        values: ["easy", "medium", "difficult"],
        message: "Difficulty is either: easy, medium, difficult",
      },
    },
    // New size field
    size: {
      type: String,
      trim: true,
      maxlength: [50, "Size must have less or equal than 50 characters"],
      validate: {
        validator: function (value: string) {
          // Validate size format like "10 ft(w) * 5 ft(h)" or "15x15 ft"
          if (!value) return true; // Optional field
          const sizeRegex =
            /^(\d+(\.\d+)?\s*(ft|m)(\s*\([wh]\))?\s*[\*x×]\s*)*\d+(\.\d+)?\s*(ft|m)(\s*\([wh]\))?$/i;
          return sizeRegex.test(value);
        },
        message: "Size format should be like: 10 ft(w) * 5 ft(h) or 15x15 ft",
      },
    },
    location: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: [true, "A product must have a location"],
    },
    availableFrom: {
      type: Date,
      required: [true, "A product must have an available from date"],
    },
    availableUntil: {
      type: Date,
      required: [true, "A product must have an available until date"],
      validate: {
        validator: function (this: IProductModel, value: Date) {
          return value > this.availableFrom;
        },
        message: "Available until date must be after available from date",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      select: false,
    },
    stock: {
      type: Number,
      required: [true, "A product must have stock quantity"],
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

// Indexes
productSchema.index({ price: 1, ratingsAverage: -1 });
productSchema.index({ location: 1 });
productSchema.index({ availableFrom: 1, availableUntil: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ difficulty: 1 });
productSchema.index({ size: 1 }); // New index for size

// Virtual populate
productSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "product",
  localField: "_id",
});

const Product = mongoose.model<IProductModel>("Product", productSchema);

export default Product;
