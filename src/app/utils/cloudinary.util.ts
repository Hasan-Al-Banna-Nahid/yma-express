import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

/* ---------------------------------- */
/* ENV VALIDATION                     */
/* ---------------------------------- */
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  throw new Error("Cloudinary environment variables are not defined");
}

/* ---------------------------------- */
/* CLOUDINARY CONFIG                  */
/* ---------------------------------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ---------------------------------- */
/* MULTER STORAGE (AUTO COMPRESSION)  */
/* ---------------------------------- */
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = req.body.folder || req.query.folder || "uploads";

    if (file.fieldname.includes("author")) {
      folder = "authors";
    } else if (req.baseUrl.includes("/api/blogs")) {
      folder = "blogs";
    }

    return {
      folder,
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
      public_id: `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}`,

      /* 🔥 AUTO COMPRESSION */
      transformation: [
        {
          width: 1600, // max width
          crop: "limit", // don’t upscale
          quality: "auto:good", // smart compression
          fetch_format: "auto", // webp / avif auto
        },
      ],
    } as any;
  },
});

/* ---------------------------------- */
/* MULTER MIDDLEWARE                  */
/* ---------------------------------- */
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

/* ---------------------------------- */
/* HELPERS                            */
/* ---------------------------------- */
export const getUploadedUrl = (file: any): string => {
  return file.path; // secure_url
};

/* ---------------------------------- */
/* DIRECT UPLOAD (BUFFER / BASE64)    */
/* ---------------------------------- */
export const uploadToCloudinary = async (
  file: any,
  folder = "uploads",
): Promise<string> => {
  if (!file) throw new Error("No file provided");

  // Already a URL
  if (typeof file === "string" && file.startsWith("http")) {
    return file;
  }

  // Base64
  if (typeof file === "string" && file.startsWith("data:image")) {
    const result = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: "image",
      transformation: [
        {
          width: 1600,
          crop: "limit",
          quality: "auto:good",
          fetch_format: "auto",
        },
      ],
    });

    return result.secure_url;
  }

  // Buffer
  if (file.buffer) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          transformation: [
            {
              width: 1600,
              crop: "limit",
              quality: "auto:good",
              fetch_format: "auto",
            },
          ],
        },
        (error, result) => {
          if (error) {
            reject(new Error(error.message));
          } else {
            resolve(result!.secure_url);
          }
        },
      );

      stream.end(file.buffer);
    });
  }

  throw new Error("Unsupported file type");
};

/* ---------------------------------- */
/* DELETE IMAGE                       */
/* ---------------------------------- */
export const deleteFromCloudinary = async (publicId: string) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};

/* ---------------------------------- */
/* UPDATE IMAGE (BEST PRACTICE)       */
/* ---------------------------------- */
export const updateCloudinaryImage = async (
  oldImageUrl: string | null,
  newFile: any,
  folder = "uploads",
): Promise<string> => {
  // 1️⃣ Delete old image if exists
  if (oldImageUrl) {
    const publicId = extractPublicId(oldImageUrl);
    if (publicId) {
      await deleteFromCloudinary(publicId);
    }
  }

  // 2️⃣ Upload new image (compressed)
  return uploadToCloudinary(newFile, folder);
};

/* ---------------------------------- */
/* EXTRACT PUBLIC ID                  */
/* ---------------------------------- */
export const extractPublicId = (url: string): string => {
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return "";
    return parts[1].split(".")[0];
  } catch {
    return "";
  }
};
