// src/modules/order/order.routes.ts
import express from "express";
import {
  createOrderHandler,
  getMyOrders,
  getOrder,
  updateOrderHandler,
  deleteOrderHandler,
  getAllOrdersHandler,
  getOrderStatsHandler,
  getTodayRevenueHandler,
  getPendingConfirmationsHandler,
  getTodayBookingsHandler,
  getTodayDeliveriesHandler,
  getRevenueOverTimeHandler,
  getOrderSummaryHandler,
  updateOrderStatusHandler,
  getUserOrdersHandler,
  searchOrdersHandler,
  generateInvoiceHandler,
  downloadInvoiceHandler,
  previewInvoiceHandler,
} from "./order.controller";
import { protectRoute } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/role.middleware";

const router = express.Router();

// ==================== USER ROUTES ====================
router.use(protectRoute);

// Order operations
router.post("/", createOrderHandler); // Create new order
router.get("/my-orders", getMyOrders); // Get current user's orders

// Order operations by ID
router.get("/:id", getOrder); // Get specific order
router.patch("/:id", updateOrderHandler); // Update order
router.delete("/:id", deleteOrderHandler); // Delete order

// Invoice operations
router.post("/:orderId/invoice/send", generateInvoiceHandler);
router.get("/:orderId/invoice/download", downloadInvoiceHandler);
router.get("/:orderId/invoice/preview", previewInvoiceHandler);

// ==================== ADMIN ROUTES ====================
router.get("/admin/all", isAdmin, getAllOrdersHandler); // Get all orders with filters
router.get("/admin/stats", isAdmin, getOrderStatsHandler); // Get order statistics
router.get("/admin/revenue/today", isAdmin, getTodayRevenueHandler); // Today's revenue
router.get("/admin/pending-count", isAdmin, getPendingConfirmationsHandler); // Pending confirmations
router.get("/admin/bookings/today", isAdmin, getTodayBookingsHandler); // Today's bookings
router.get("/admin/deliveries/today", isAdmin, getTodayDeliveriesHandler); // Today's deliveries
router.get("/admin/revenue/over-time", isAdmin, getRevenueOverTimeHandler); // Revenue over time for charts
router.get("/admin/summary/:orderId", isAdmin, getOrderSummaryHandler); // Order summary with user info
router.get("/admin/search", isAdmin, searchOrdersHandler); // Search orders
router.get("/admin/user/:userId", isAdmin, getUserOrdersHandler); // Get orders by user ID
router.patch("/admin/:id/status", isAdmin, updateOrderStatusHandler); // Update order status

export default router;
