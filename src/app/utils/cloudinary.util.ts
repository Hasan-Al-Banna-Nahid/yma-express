import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

/* ---------------------------------- */
/* CLOUDINARY CONFIG                  */
/* ---------------------------------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ---------------------------------- */
/* MULTER MEMORY STORAGE              */
/* ---------------------------------- */
/**
 * আমরা memoryStorage ব্যবহার করছি কারণ:
 * ১. এটি "Unexpected field" এরর হওয়ার ঝুঁকি কমায়।
 * ২. ফাইল সরাসরি র‍্যামে (Buffer) থাকে, ফলে Sharp দিয়ে সহজে প্রসেস করা যায়।
 * ৩. ক্লাউডিনারি স্টোরেজ ইঞ্জিনের সীমাবদ্ধতা এড়িয়ে ডাইনামিক কাজ করা যায়।
 */
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // ১০ মেগাবাইট লিমিট
  },
  fileFilter: (_, file, cb) => {
    // ইমেজ এবং পিডিএফ উভয়কেই সাপোর্ট করবে
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(
        new Error("শুধুমাত্র ইমেজ এবং পিডিএফ ফাইল আপলোড করা সম্ভব") as any,
        false,
      );
    }
  },
});

/* ---------------------------------- */
/* CLOUDINARY UPLOAD HELPER           */
/* ---------------------------------- */
/**
 * @param fileBuffer - ফাইলের বাইনারি বাফার ডাটা
 * @param folder - ক্লাউডিনারির ফোল্ডার নাম
 * @returns - আপলোড করা ফাইলের সিকিউর URL
 */
export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  folder = "uploads",
  resourceType: "image" | "auto" | "raw" = "image",
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        // ইমেজের ক্ষেত্রে অটো অপ্টিমাইজেশন
        transformation:
          resourceType === "image"
            ? [
                {
                  width: 1600,
                  crop: "limit",
                  quality: "auto:good",
                  fetch_format: "auto",
                },
              ]
            : undefined,
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Upload Error:", error);
          reject(new Error("ক্লাউডিনারিতে ফাইল আপলোড ব্যর্থ হয়েছে"));
        } else {
          resolve(result!.secure_url);
        }
      },
    );
    // বাফার ডাটা স্ট্রিমে পাঠিয়ে দেওয়া হচ্ছে
    stream.end(fileBuffer);
  });
};

/* ---------------------------------- */
/* DELETE & EXTRACT HELPERS           */
/* ---------------------------------- */
export const deleteFromCloudinary = async (publicId: string) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Cloudinary Delete Error:", err);
  }
};

export const extractPublicId = (url: string): string => {
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return "";
    const filePart = parts[1].split("/");
    const idWithExtension = filePart[filePart.length - 1];
    return idWithExtension.split(".")[0];
  } catch {
    return "";
  }
};
