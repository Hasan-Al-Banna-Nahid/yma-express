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
  createFrequentlyBoughtRelationships,
  getAllFrequentRelationships,
} from "./product.controller";
import { protectRoute } from "../../middlewares/auth.middleware";
import { restrictTo } from "../../middlewares/authorization.middleware";
import { upload } from "../../utils/cloudinary.util";

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
router.get("/frequently-bought/all", getAllFrequentRelationships);

// GET frequently bought for specific product (PUBLIC)
// ==================== PROTECTED ROUTES ====================
router.use(protectRoute);

router.post(
  "/",

  restrictTo("superadmin", "admin", "editor"),
  upload.fields([
    { name: "imageCover", maxCount: 1 }, // cover image
    { name: "imageCover[]", maxCount: 1 }, // just in case frontend sends array
    { name: "images", maxCount: 5 }, // product images
    { name: "images[]", maxCount: 5 }, // product images as array
  ]),
  createProduct,
);
router.patch(
  "/:id",
  restrictTo("admin", "editor"),
  upload.fields([
    { name: "imageCover", maxCount: 1 },
    { name: "imageCover[]", maxCount: 1 },
    { name: "images", maxCount: 5 },
    { name: "images[]", maxCount: 5 },
  ]),
  updateProduct,
);
router.delete(
  "/:id",
  restrictTo("superadmin", "admin", "editor"),
  deleteProduct,
);
router.patch(
  "/:id/stock",
  restrictTo("superadmin", "admin", "editor"),
  updateProductStock,
);
router.get(
  "/search/admin",
  restrictTo("superadmin", "admin", "editor"),
  adminSearchProducts,
);
router.patch(
  "/:productId/top-selling",
  restrictTo("superadmin", "admin", "editor"),
  markAsTopSelling,
);
router.patch(
  "/:productId/top-pick",
  restrictTo("superadmin", "admin", "editor"),
  markAsTopPick,
);
// In the protected routes section:
router.post(
  "/frequently-bought",
  restrictTo("superadmin", "admin", "editor"),
  upload.fields([
    { name: "images[]", maxCount: 5 }, // For updating product images
    { name: "newImageCover", maxCount: 1 }, // For updating cover image
  ]),
  createFrequentlyBoughtRelationships,
);
// NEW PROTECTED ROUTE (for recording purchases):
router.post("/recommendations/record-purchase", recordPurchase);

export default router;
