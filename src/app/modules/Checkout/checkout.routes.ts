// src/routes/checkout.routes.ts
import { Router } from "express";
import {
  checkoutFromCart, // Main cart checkout
  quickCheckout, // Direct products checkout
  getCartSummary, // Cart summary
  getOrderById,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  checkAvailability,
  calculateDeliveryFeeAPI,
} from "./checkout.controller";
// import { authenticate, authorize } from "../middlewares/auth.middleware";

const router = Router();

// Public routes
router.post("/", checkoutFromCart); // Main checkout from cart
router.post("/quick", quickCheckout); // Quick checkout with products
router.get("/cart-summary", getCartSummary); // Get cart summary

// Utility routes
router.post("/check-availability", checkAvailability);
router.post("/calculate-delivery-fee", calculateDeliveryFeeAPI);

// Order routes
router.get("/order/:orderId", getOrderById);
router.get("/user/:userId/orders", getUserOrders);

// Admin routes
// router.get("/all", authenticate, authorize("admin"), getAllOrders);
// router.patch("/order/:orderId/status", authenticate, authorize("admin"), updateOrderStatus);
// router.post("/order/:orderId/cancel", authenticate, cancelOrder);

export default router;
