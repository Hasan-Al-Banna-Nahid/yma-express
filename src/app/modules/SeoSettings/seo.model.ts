import mongoose, { Schema } from "mongoose";
import { ISeoSettings } from "./seo.interface";

export type ISeoSettingsDocument = ISeoSettings & mongoose.Document;

const seoSettingsSchema = new Schema<ISeoSettingsDocument>(
  {
    key: {
      type: String,
      default: "global",
      unique: true,
      immutable: true,
      required: true,
    },
    siteName: {
      type: String,
      trim: true,
      default: "",
      maxlength: [120, "Site name cannot exceed 120 characters"],
    },
    defaultMetaTitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: [120, "Meta title cannot exceed 120 characters"],
    },
    defaultMetaDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: [300, "Meta description cannot exceed 300 characters"],
    },
    defaultMetaKeywords: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Meta keywords cannot exceed 500 characters"],
    },
    defaultCanonicalBaseUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: [200, "Canonical base URL cannot exceed 200 characters"],
    },
    defaultOpenGraphTitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: [120, "Open Graph title cannot exceed 120 characters"],
    },
    defaultOpenGraphDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: [300, "Open Graph description cannot exceed 300 characters"],
    },
    defaultRobots: {
      type: String,
      trim: true,
      default: "index, follow",
      maxlength: [80, "Robots value cannot exceed 80 characters"],
    },
  },
  {
    timestamps: true,
  },
);

export const SeoSettings = mongoose.model<ISeoSettingsDocument>(
  "SeoSettings",
  seoSettingsSchema,
);
