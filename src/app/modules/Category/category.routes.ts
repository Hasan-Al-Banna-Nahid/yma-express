// src/routes/category.routes.ts
import express from "express";
import * as categoryController from "./category.controller";
import { protectRoute } from "../../middlewares/auth.middleware"; // Correct import
import { restrictTo } from "../../middlewares/authorization.middleware";
import { upload } from "../../utils/cloudinary.util";

const router = express.Router();

router.route("/").get(categoryController.getCategories); // Public GET for all categories
router.route("/:id").get(categoryController.getCategory); // Public GET for single category

// Routes below this point require authentication and specific roles
router.use(protectRoute);

router
  .route("/")
  .post(
    restrictTo("admin", "superadmin", "editor"),
    upload.single("image"),
    categoryController.createCategory
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
