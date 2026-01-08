import express from "express";
import * as categoryController from "./category.controller";
import { protectRoute } from "../../middlewares/auth.middleware";
import { restrictTo } from "../../middlewares/authorization.middleware";
import { upload } from "../../utils/cloudinary.util";

const router = express.Router();

// Public routes
router.route("/").get(categoryController.getCategories);
router.route("/hardcoded").get(categoryController.getHardcodedCategories); // Add this line
router.route("/:id").get(categoryController.getCategory);

// Protected routes (admin only)
router.use(protectRoute);

// Admin routes for managing all categories
router
  .route("/")
  .post(
    restrictTo("admin", "superadmin", "editor"),
    upload.single("image"),
    categoryController.createCategory
  );

// Add seed route (admin only)
router.post(
  "/seed/hardcoded",
  protectRoute,
  restrictTo("admin", "superadmin"),
  categoryController.seedCategories
);

router
  .route("/:id")
  .patch(
    restrictTo("admin", "superadmin", "editor"),
    upload.single("image"),
    categoryController.updateCategory
  )
  .delete(
    restrictTo("admin", "superadmin", "editor"),
    categoryController.deleteCategory
  );

export default router;
