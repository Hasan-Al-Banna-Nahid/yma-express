import mongoose, { Document, Schema, Types } from "mongoose";
import { ICategory } from "./category.interface";

export interface ICategoryModel extends Omit<ICategory, "_id">, Document {}

const categorySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "A category must have a name"],
      unique: true,
      trim: true,
      maxlength: [
        50,
        "A category name must have less or equal than 50 characters",
      ],
      minlength: [
        3,
        "A category name must have more or equal than 3 characters",
      ],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret: any) {
        // Add type annotation
        delete ret.id; // Remove the duplicate id field
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret: any) {
        // Add type annotation
        delete ret.id; // Remove the duplicate id field
        return ret;
      },
    },
    id: false, // Disable the default virtual id field
  }
);

// Pre-save middleware to generate slug from name
categorySchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = (this.name as string)
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "-");
  }
  next();
});

// Virtual for product count
categorySchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "categories",
  count: true,
});

// Indexes for better performance
categorySchema.index({ slug: 1 });
categorySchema.index({ name: 1 });
categorySchema.index({ isActive: 1 });

const Category = mongoose.model<ICategoryModel>("Category", categorySchema);

export default Category;
