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

// Main storage configuration with dynamic folder
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Get folder from request or use default
    let folder = req.body.folder || req.query.folder || "uploads";

    // Override folder for specific field names
    if (file.fieldname === "authorImage" || file.fieldname.includes("author")) {
      folder = "authors";
    } else if (req.baseUrl.includes("/api/blogs")) {
      // Default to blogs folder for blog routes
      folder = "blogs";
    }

    return {
      folder: folder,
      allowed_formats: ["jpg", "png", "jpeg", "webp", "gif", "svg"],
      resource_type: "auto",
      // Optional: Add folder in the public_id for better organization
      public_id: `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    } as any;
  },
});

// Multer middleware
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// Function to get uploaded URL (CloudinaryStorage already uploads)
export const getUploadedUrl = (file: any): string => {
  return file.path; // CloudinaryStorage stores URL in file.path
};

// Direct upload function (for buffers or base64)
export const uploadToCloudinary = async (
  file: any,
  folder: string = "uploads"
): Promise<string> => {
  try {
    // If it's already a URL, return it
    if (typeof file === "string" && file.startsWith("http")) {
      return file;
    }

    // If it's a base64 string
    if (typeof file === "string" && file.startsWith("data:image/")) {
      const result = await cloudinary.uploader.upload(file, {
        folder: folder,
      });
      return result.secure_url;
    }

    // If it's a file object with buffer
    if (file.buffer) {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: folder,
            resource_type: "image",
          },
          (error, result) => {
            if (error) {
              reject(new Error(`Cloudinary upload failed: ${error.message}`));
            } else {
              resolve(result!.secure_url);
            }
          }
        );

        stream.end(file.buffer);
      });
    }

    // Default case (should not happen)
    throw new Error("Unsupported file type");
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

// Extract public ID from Cloudinary URL
export const extractPublicId = (url: string): string => {
  try {
    const parts = url.split("/");
    const uploadIndex = parts.findIndex((part) => part === "upload");
    if (uploadIndex === -1) return "";

    // Get everything after 'upload/version/'
    const versionIndex = uploadIndex + 1;
    const publicIdWithExtension = parts.slice(versionIndex + 1).join("/");
    return publicIdWithExtension.split(".")[0];
  } catch (error: any) {
    console.error("Error extracting public ID:", error);
    return "";
  }
};
