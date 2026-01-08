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
  clientSearchProducts,
  adminSearchProducts,
  getAvailableFilters,
  getTopSellingProducts,
  markAsTopSelling,
  markAsTopPick,
  getTopPicks,
  // ADD THESE NEW IMPORTS:
  getFrequentlyBoughtTogether,
  getCartRecommendations,
  recordPurchase,
} from "./product.controller";
import { protectRoute } from "../../middlewares/auth.middleware";
import { restrictTo } from "../../middlewares/authorization.middleware";

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.get("/", getAllProducts);
router.get("/top-picks", getTopPicks);
router.get("/states", getAvailableStates);
router.get("/state/:state", getProductsByState);
router.get("/featured", getFeaturedProducts);
router.get("/search", searchProducts);
router.get("/category/:categoryId", getProductsByCategory);
router.get("/search/client", clientSearchProducts);
router.get("/filters", getAvailableFilters);
router.get("/top-selling", getTopSellingProducts);

// NEW RECOMMENDATION ROUTES (PUBLIC):
router.post("/recommendations/frequently-bought", getFrequentlyBoughtTogether);
router.post("/recommendations/cart", getCartRecommendations);

router.get("/:id", getProduct);

// ==================== PROTECTED ROUTES ====================
router.use(protectRoute);

router.post("/", restrictTo("superadmin", "admin", "editor"), createProduct);
router.patch(
  "/:id",
  restrictTo("superadmin", "admin", "editor"),
  updateProduct
);
router.delete(
  "/:id",
  restrictTo("superadmin", "admin", "editor"),
  deleteProduct
);
router.patch(
  "/:id/stock",
  restrictTo("superadmin", "admin", "editor"),
  updateProductStock
);
router.get(
  "/search/admin",
  restrictTo("superadmin", "admin", "editor"),
  adminSearchProducts
);
router.patch(
  "/:productId/top-selling",
  restrictTo("superadmin", "admin", "editor"),
  markAsTopSelling
);
router.patch(
  "/:productId/top-pick",
  restrictTo("superadmin", "admin", "editor"),
  markAsTopPick
);

// NEW PROTECTED ROUTE (for recording purchases):
router.post("/recommendations/record-purchase", recordPurchase);

export default router;
