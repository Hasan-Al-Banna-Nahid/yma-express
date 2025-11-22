// src/routes/product.route.ts
import express from "express";
import {
  createProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductsByState,
  getAvailableStates,
  updateProductStock,
  getFeaturedProducts,
  searchProducts,
  getProductsByCategory,
} from "../controllers/product.controller";
import { protectRoute, restrictTo } from "../middlewares/auth.middleware";

const router = express.Router();

// Public routes
router.get("/", getAllProducts);
router.get("/states", getAvailableStates);
router.get("/state/:state", getProductsByState);
router.get("/featured", getFeaturedProducts);
router.get("/search", searchProducts);
router.get("/category/:categoryId", getProductsByCategory);
router.get("/:id", getProduct);

// Protected routes (Admin only)
router.use(protectRoute, restrictTo("admin"));

router.post("/", createProduct);
router.patch("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.patch("/:id/stock", updateProductStock);

export default router;
