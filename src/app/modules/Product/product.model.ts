import mongoose, { Schema, Model } from "mongoose";
import { IProduct } from "./product.interface";

export type IProductModel = IProduct & mongoose.Document;

const productSchema: Schema = new Schema(
  {
    isTopPick: {
      type: Boolean,
      default: false,
    },
    topPickRank: {
      type: Number,
      min: 1,
      max: 100,
    },
    topPickUpdatedAt: {
      type: Date,
    },
    isTopSelling: {
      type: Boolean,
      default: false,
    },
    topSellingRank: {
      type: Number,
      min: 1,
      max: 100,
    },
    topSellingNotes: {
      type: String,
      trim: true,
      maxlength: [200, "Notes cannot exceed 200 characters"],
    },
    topSellingMarkedAt: {
      type: Date,
    },
    salesCount: {
      // You can update this based on actual bookings
      type: Number,
      default: 0,
      min: 0,
    },
    lastSoldAt: {
      type: Date,
    },
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
    perDayPrice: {
      type: Number,
      min: [0, "Per day price cannot be negative"],
    },
    perWeekPrice: {
      type: Number,
      min: [0, "Per week price cannot be negative"],
    },
    deliveryAndCollection: {
      type: String,
      required: [true, "Delivery and collection information is required"],
      trim: true,
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
      type: String,
      required: [true, "Duration is required"],
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
    isSensitive: {
      type: Boolean,
      required: [true, "Sensitive item status is required"],
      default: false,
    },
    dateAdded: {
      type: Date,
      default: Date.now,
    },
    material: {
      type: String,
      required: [true, "Material information is required"],
      trim: true,
    },
    design: {
      type: String,
      required: [true, "Design information is required"],
      trim: true,
    },
    ageRange: {
      min: {
        type: Number,
        required: [true, "Minimum age is required"],
        min: [0, "Minimum age cannot be negative"],
      },
      max: {
        type: Number,
        required: [true, "Maximum age is required"],
        validate: {
          validator: function (this: any, value: number): boolean {
            return value >= this.ageRange.min;
          },
          message: "Maximum age must be greater than or equal to minimum age",
        },
      },
      unit: {
        type: String,
        required: [true, "Age unit is required"],
        enum: {
          values: ["years", "months"],
          message: "Age unit must be years or months",
        },
      },
    },
    safetyFeatures: {
      type: [String],
      required: [true, "At least one safety feature is required"],
      validate: {
        validator: function (value: string[]): boolean {
          return value.length > 0;
        },
        message: "At least one safety feature is required",
      },
    },
    qualityAssurance: {
      isCertified: {
        type: Boolean,
        required: [true, "Certification status is required"],
        default: false,
      },
      certification: {
        type: String,
        trim: true,
      },
      warrantyPeriod: {
        type: String,
        trim: true,
      },
      warrantyDetails: {
        type: String,
        trim: true,
      },
    },
    purchaseHistory: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
        },
        count: {
          type: Number,
          default: 0,
        },
        lastPurchased: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    frequentlyBoughtTogether: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
        },
        frequency: {
          type: Number,
          default: 0,
          min: 0,
          max: 1,
        },
        confidence: {
          type: Number,
          default: 0,
          min: 0,
          max: 1,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.virtual("dimensions.area").get(function (this: IProductModel) {
  return this.dimensions.length * this.dimensions.width;
});
productSchema.index({ "frequentlyBoughtTogether.frequency": -1 });

productSchema
  .virtual("formattedDimensions")
  .get(function (this: IProductModel) {
    return `${this.dimensions.length}ft x ${this.dimensions.width}ft x ${this.dimensions.height}ft`;
  });

productSchema.virtual("formattedAgeRange").get(function (this: IProductModel) {
  return `${this.ageRange.min}-${this.ageRange.max} ${this.ageRange.unit}`;
});

productSchema.virtual("isActive").get(function (this: IProductModel) {
  return this.active;
});

productSchema.virtual("isAvailable").get(function (this: IProductModel) {
  const now = new Date();
  return (
    this.active &&
    this.stock > 0 &&
    now >= this.availableFrom &&
    now <= this.availableUntil
  );
});

productSchema.virtual("hasWarranty").get(function (this: IProductModel) {
  return (
    this.qualityAssurance.warrantyPeriod &&
    this.qualityAssurance.warrantyPeriod.length > 0
  );
});

productSchema.index({ "location.country": 1, "location.state": 1 });
productSchema.index({ price: 1 });
productSchema.index({ categories: 1 });
productSchema.index({ "dimensions.length": 1, "dimensions.width": 1 });
productSchema.index({ "ageRange.min": 1, "ageRange.max": 1 });
productSchema.index({ material: 1 });
productSchema.index({ isSensitive: 1 });
productSchema.index({ "qualityAssurance.isCertified": 1 });

const Product: Model<IProductModel> = mongoose.model<IProductModel>(
  "Product",
  productSchema
);

export default Product;
