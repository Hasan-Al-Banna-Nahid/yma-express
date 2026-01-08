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

// Protected routes (admin only)
router.use(protectRoute);

router.post(
  "/",
  restrictTo("admin", "superadmin", "editor"),
  upload.array("images", 10), // Max 10 images
  createBlog
);

router.patch(
  "/:id",
  restrictTo("admin", "superadmin", "editor"),
  upload.array("images", 10),
  updateBlog
);

router.delete("/:id", restrictTo("admin", "superadmin", "editor"), deleteBlog);
// Add to your existing blog.routes.ts, inside protected routes section
router.patch(
  "/:id/unpublish",
  protectRoute,
  restrictTo("admin", "superadmin", "editor"),
  togglePublishStatus
);
export default router;
