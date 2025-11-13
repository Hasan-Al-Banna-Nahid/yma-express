// src/utils/cloudinary.util.ts
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// Validate Cloudinary environment variables
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  throw new Error("Cloudinary environment variables are not defined");
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer-Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "ecommerce",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ width: 1200, height: 800, crop: "limit" }],
  } as any,
});

// Multer middleware for handling file uploads
export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Utility to upload a single file to Cloudinary
export const uploadToCloudinary = async (
  file: Express.Multer.File
): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(file.path);
    return result.secure_url;
  } catch (error: any) {
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

// Utility to delete file from Cloudinary
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error: any) {
    throw new Error(`Cloudinary delete failed: ${error.message}`);
  }
};
