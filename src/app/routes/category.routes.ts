// src/routes/category.routes.ts
import express from "express";
import * as categoryController from "../controllers/category.controller";
import { protectRoute, restrictTo } from "../middlewares/auth.middleware";
import { upload } from "../utils/cloudinary.util";

const router = express.Router();

router
  .route("/")
  .get(categoryController.getCategories)
  .post(
    protectRoute,
    restrictTo("admin"),
    upload.single("image"),
    categoryController.createCategory
  );

router
  .route("/:id")
  .get(categoryController.getCategory)
  .patch(
    protectRoute,
    restrictTo("admin"),
    upload.single("image"),
    categoryController.updateCategory
  )
  .delete(protectRoute, restrictTo("admin"), categoryController.deleteCategory);

export default router;
