// src/interfaces/category.interface.ts

export interface ICategory {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  createdAt?: Date;
}

// src/models/category.model.ts
import mongoose, { Document, Schema } from "mongoose";

export interface ICategoryModel extends ICategory, Document {}

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
    slug: String,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

categorySchema.index({ slug: 1 });

const Category = mongoose.model<ICategoryModel>("Category", categorySchema);

export default Category;
