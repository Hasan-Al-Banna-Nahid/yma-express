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
  // Add the new search imports
  clientSearchProducts,
  adminSearchProducts,
  getAvailableFilters,
  getTopSellingProducts,
  markAsTopSelling,
} from "./product.controller";
import { protectRoute } from "../../middlewares/auth.middleware";
import { restrictTo } from "../../middlewares/authorization.middleware";

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.patch(
  "/:productId/top-selling",
  protectRoute,
  restrictTo("superadmin", "admin", "editor"),
  markAsTopSelling
);
router.get("/top-selling", getTopSellingProducts);

// Get all products with basic filtering
router.get("/", getAllProducts);

// Get available states
router.get("/states", getAvailableStates);

// Get products by state
router.get("/state/:state", getProductsByState);

// Get featured products
router.get("/featured", getFeaturedProducts);

// Legacy search (text-based) - keep for backward compatibility
router.get("/search", searchProducts);

// Get products by category
router.get("/category/:categoryId", getProductsByCategory);

// New: Client advanced search (public)
router.get("/search/client", clientSearchProducts);

// New: Get available filters for client search UI (public)
router.get("/filters", getAvailableFilters);

// Get single product
router.get("/:id", getProduct);

// ==================== PROTECTED ROUTES ====================
router.use(protectRoute);

// Create product (admin/editor only)
router.post("/", restrictTo("superadmin", "admin", "editor"), createProduct);

// Update product (admin/editor only)
router.patch(
  "/:id",
  restrictTo("superadmin", "admin", "editor"),
  updateProduct
);

// Delete product (admin/editor only)
router.delete(
  "/:id",
  restrictTo("superadmin", "admin", "editor"),
  deleteProduct
);

// Update stock (admin/editor only)
router.patch(
  "/:id/stock",
  restrictTo("superadmin", "admin", "editor"),
  updateProductStock
);

// New: Admin advanced search (protected)
router.get(
  "/search/admin",
  restrictTo("superadmin", "admin", "editor"),
  adminSearchProducts
);

export default router;
