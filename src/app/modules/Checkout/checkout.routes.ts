import express from "express";
import {
  createOrder,
  checkStock,
  checkDateAvailability,
  getAvailableDates,
  validatePromoCode,
  getActivePromos,
  applyPromoToCart, // Add this import
} from "./checkout.controller";
import { protectRoute } from "../../middlewares/auth.middleware";

const router = express.Router();

// All checkout routes require authentication
router.use(protectRoute);

// POST /api/v1/checkout - Create new order
router.post("/", createOrder);

// GET /api/v1/checkout/stock - Check stock for cart items
router.get("/stock", checkStock);

// POST /api/v1/checkout/check-availability - Check date availability
router.post("/check-availability", checkDateAvailability);

// GET /api/v1/checkout/available-dates/:productId - Get available dates for a product
router.get("/available-dates/:productId", getAvailableDates);

// ============ PROMO CODE ROUTES ============

// POST /api/v1/checkout/validate-promo - Validate promo code
router.post("/validate-promo", validatePromoCode);

// GET /api/v1/checkout/promos - Get all active promos
router.get("/promos", getActivePromos);

// POST /api/v1/checkout/apply-promo - Apply promo code to cart
router.post("/apply-promo", applyPromoToCart);

export default router;
