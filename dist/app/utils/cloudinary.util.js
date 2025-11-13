"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromCloudinary = exports.uploadToCloudinary = exports.upload = void 0;
// src/utils/cloudinary.util.ts
const cloudinary_1 = require("cloudinary");
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const multer_1 = __importDefault(require("multer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Validate Cloudinary environment variables
if (!process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary environment variables are not defined");
}
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Configure Multer-Cloudinary storage
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: {
        folder: "ecommerce",
        allowed_formats: ["jpg", "png", "jpeg", "webp"],
        transformation: [{ width: 1200, height: 800, crop: "limit" }],
    },
});
// Multer middleware for handling file uploads
exports.upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});
// Utility to upload a single file to Cloudinary
const uploadToCloudinary = async (file) => {
    try {
        const result = await cloudinary_1.v2.uploader.upload(file.path);
        return result.secure_url;
    }
    catch (error) {
        throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
};
exports.uploadToCloudinary = uploadToCloudinary;
// Utility to delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary_1.v2.uploader.destroy(publicId);
    }
    catch (error) {
        throw new Error(`Cloudinary delete failed: ${error.message}`);
    }
};
exports.deleteFromCloudinary = deleteFromCloudinary;
