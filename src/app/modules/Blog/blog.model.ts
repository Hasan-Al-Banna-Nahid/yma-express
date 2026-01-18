import mongoose, { Schema, Model } from "mongoose";
import { IBlog, BlogStatus } from "./blog.interface";

export type IBlogModel = IBlog & mongoose.Document;

const blogSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Add author details directly in blog
    authorDetails: {
      name: {
        type: String,
        trim: true,
      },
      avatar: {
        type: String,
      },
      profilePicture: {
        type: String,
      },
      bio: {
        type: String,
        maxlength: [500, "Bio cannot exceed 500 characters"],
      },
      designation: {
        type: String,
        trim: true,
      },
    },
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    description: {
      type: String,
      required: [true, "Blog description is required"],
    },
    images: [String],

    category: {
      type: String,
      trim: true,
    },
    tags: [String],
    status: {
      type: String,
      enum: ["draft", "published", "archived", "scheduled"],
      default: "draft",
      index: true,
    },
    publishedAt: {
      type: Date,
    },
    scheduledAt: {
      type: Date,
    },
    customField1: String,
    customField2: String,
    customField3: String,
    customField4: String,
    customField5: String,
    customField6: String,
    customField7: String,
    customField8: String,
    subtitle: String,
    // Add these author fields:
    authorName: {
      type: String,
      required: true,
    },
    authorImage: {
      type: String,
      default: "",
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    seoTitle: {
      type: String,
      trim: true,
      maxlength: [60, "SEO title cannot exceed 60 characters"],
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: [160, "SEO description cannot exceed 160 characters"],
    },
    seoKeywords: [String],
    views: {
      type: Number,
      default: 0,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    readTime: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
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

  // Calculate read time (approx 200 words per minute)
  if (this.isModified("description")) {
    const wordCount = this.description.split(/\s+/).length;
    this.readTime = Math.ceil(wordCount / 200);
  }

  // Set publishedAt when status changes to published
  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  next();
});

// Virtual for isPublished
blogSchema.virtual("isPublished").get(function () {
  return this.status === "published";
});

// Virtual for formatted date
blogSchema.virtual("formattedDate").get(function () {
  return this.publishedAt
    ? new Date(this.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date(this.createdAt!).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
});

// Indexes
blogSchema.index({ title: "text", subtitle: "text", description: "text" });
blogSchema.index({ status: 1, createdAt: -1 });
blogSchema.index({ category: 1, status: 1 });
blogSchema.index({ author: 1, status: 1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ isFeatured: 1, status: 1 });
blogSchema.index({ publishedAt: -1 });
blogSchema.index({ scheduledAt: 1 });
blogSchema.index({ createdAt: -1 });

const Blog: Model<IBlogModel> = mongoose.model<IBlogModel>("Blog", blogSchema);

export default Blog;
