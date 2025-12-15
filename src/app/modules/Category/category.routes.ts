// src/routes/category.routes.ts
import express from "express";
import * as categoryController from "./category.controller";
import {
  protect,
  restrictTo,
} from "../../middlewares/authorization.middleware";
import { upload } from "../../utils/cloudinary.util";

const router = express.Router();

router.use(protect);
router
  .route("/")
  .get(categoryController.getCategories)
  .post(
    restrictTo("admin", "superadmin", "editor"),
    upload.single("image"),
    categoryController.createCategory
  );

router
  .route("/:id")
  .get(categoryController.getCategory)
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
