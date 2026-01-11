import express from "express";
import {
  getAllOrders,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
  searchOrders,
  getTodayOrders,
  getPendingOrders,
  getOrdersByStatus,
  generateInvoice,
  downloadInvoice,
  previewInvoice,
} from "./order.service"; // Import from service
import { protectRoute } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/role.middleware";

const router = express.Router();

// ==================== USER ROUTES ====================
router.use(protectRoute);

// Order operations
// router.post("/", createOrderHandler); // Create new order
// router.get("/my-orders", getMyOrders); // Get current user's orders

// Order operations by ID
// router.get("/:id", getOrder); // Get specific order
// router.patch("/:id", updateOrder); // Update order
router.delete("/:id", deleteOrder); // Delete order

// Invoice operations
// router.post("/:orderId/invoice/send", generateInvoice);
// router.get("/:orderId/invoice/download", downloadInvoice);
// router.get("/:orderId/invoice/preview", previewInvoice);

// ==================== ADMIN ROUTES ====================
// router.get("/admin", isAdmin, getAllOrders); // Get all orders with filters
// router.get("/admin/stats", isAdmin, getOrderStats); // Get order statistics
// router.get("/admin/search", isAdmin, searchOrders); // Search orders
router.get("/admin/today", isAdmin, getTodayOrders); // Get today's orders
router.get("/admin/pending", isAdmin, getPendingOrders); // Get pending orders
// router.get("/admin/user/:userId", isAdmin, getUserOrders); // Get orders by user ID
// router.patch("/admin/:id/status", isAdmin, updateOrderStatus); // Update order status
// router.get("/admin/status/:status", isAdmin, getOrdersByStatus); // Get orders by status

export default router;
