import express from "express";
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  searchBlogs,
  togglePublishStatus,
  getBlogStats,
} from "./blog.controller";
import { protectRoute } from "../../middlewares/auth.middleware";
import { restrictTo } from "../../middlewares/authorization.middleware";
import { upload } from "../../utils/cloudinary.util";

const router = express.Router();

// Public routes
router.get("/", getAllBlogs);
router.get("/search", searchBlogs);
router.get("/slug/:slug", getBlogBySlug);
router.get("/:id", getBlogById);

// Protected routes
router.use(protectRoute);

// Admin/Editor routes
router.get("/stats", restrictTo("admin", "superadmin", "editor"), getBlogStats);

router.post(
  "/",
  restrictTo("admin", "superadmin", "editor"),
  upload.fields([
    // Use .fields() instead of .array()
    { name: "authorImage", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]),
  createBlog
);

router.patch(
  "/:id",
  restrictTo("admin", "superadmin", "editor"),
  upload.fields([
    // Use .fields() instead of .array()
    { name: "authorImage", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]),
  updateBlog
);

router.patch(
  "/:id/status",
  restrictTo("admin", "superadmin", "editor"),
  togglePublishStatus
);

router.delete("/:id", restrictTo("admin", "superadmin", "editor"), deleteBlog);

export default router;
