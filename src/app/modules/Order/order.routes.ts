import express from "express";
import {
  getAllOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
  getOrderStats,
  getUserOrders,
  searchOrders,
  getTodayOrders,
  getPendingOrders,
  getMyOrders,
  getOrdersByStatus,
  generateInvoice,
  downloadInvoice,
  previewInvoice,
} from "./order.controller";
import { protectRoute } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/role.middleware";

const router = express.Router();

// ==================== USER ROUTES ====================
router.use(protectRoute);

// Order operations
router.get("/my-orders", getMyOrders);
router.post("/", createOrder);

// ==================== SPECIFIC ADMIN ROUTES (MUST COME BEFORE /:id) ====================
// CRITICAL: This specific /admin route must come BEFORE /:id
router.get("/admin", isAdmin, getAllOrders);

// ==================== ORDER ID ROUTES ====================
router.get("/:id", getOrder);
router.patch("/:id", updateOrder);
router.delete("/:id", deleteOrder);

// Invoice operations (users)
router.post("/:orderId/invoice/send", generateInvoice);
router.get("/:orderId/invoice/download", downloadInvoice);
router.get("/:orderId/invoice/preview", previewInvoice);

// ==================== OTHER ADMIN ROUTES ====================
router.get("/admin/stats", isAdmin, getOrderStats);
router.get("/admin/search", isAdmin, searchOrders);
router.get("/admin/today", isAdmin, getTodayOrders);
router.get("/admin/pending", isAdmin, getPendingOrders);
router.get("/admin/user/:userId", isAdmin, getUserOrders);
router.patch("/admin/:id/status", isAdmin, updateOrderStatus);
router.get("/admin/status/:status", isAdmin, getOrdersByStatus);

// Admin invoice operations
router.post("/admin/:orderId/invoice/send", isAdmin, generateInvoice);
router.get("/admin/:orderId/invoice/download", isAdmin, downloadInvoice);

export default router;
