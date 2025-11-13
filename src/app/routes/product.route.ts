// src/routes/product.routes.ts
import express from "express";
import * as productController from "../controllers/product.controller";
import { protectRoute, restrictTo } from "../middlewares/auth.middleware";
import { upload } from "../utils/cloudinary.util";

const router = express.Router();

// Configure multer for multiple file uploads
const uploadProductImages = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 10 },
]);

// Public routes
router.get("/locations/filters", productController.getAvailableLocations);
router.get("/", productController.getProducts);
router.get("/:id", productController.getProduct);

// Protected routes (Admin only)
router.use(protectRoute, restrictTo("admin"));

router.post("/", uploadProductImages, productController.createProduct);
router.patch("/:id", uploadProductImages, productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

export default router;
