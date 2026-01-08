import mongoose, { Schema, Model } from "mongoose";
import { IBlog } from "./blog.interface";

export type IBlogModel = IBlog & mongoose.Document;

const blogSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [300, "Subtitle cannot exceed 300 characters"],
    },
    description: {
      type: String,
      required: [true, "Blog description is required"],
    },
    images: [String],
    customField1: { type: String, trim: true },
    customField2: { type: String, trim: true },
    customField3: { type: String, trim: true },
    customField4: { type: String, trim: true },
    customField5: { type: String, trim: true },
    isPublished: {
      type: Boolean,
      default: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug from title before saving
blogSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "-");
  }
  next();
});

// Indexes
blogSchema.index({ title: "text", subtitle: "text", description: "text" });
blogSchema.index({ slug: 1 });
blogSchema.index({ isPublished: 1 });
blogSchema.index({ createdAt: -1 });

const Blog: Model<IBlogModel> = mongoose.model<IBlogModel>("Blog", blogSchema);

export default Blog;
