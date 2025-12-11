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
} from "./product.controller";
import {
  protect,
  restrictTo,
} from "../../middlewares/authorization.middleware";

const router = express.Router();

router.get("/", getAllProducts);
router.get("/states", getAvailableStates);
router.get("/state/:state", getProductsByState);
router.get("/featured", getFeaturedProducts);
router.get("/search", searchProducts);
router.get("/category/:categoryId", getProductsByCategory);
router.get("/:id", getProduct);

router.use(protect);

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

export default router;
