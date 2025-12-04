// src/routes/admin/order.routes.ts
import express from "express";
import {
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
  getOrderStats,
  generateInvoice,
  searchOrders,
} from "../../controllers/admin/order/order.controller";
import { protectRoute, restrictTo } from "../../middlewares/auth.middleware";

const router = express.Router();

router.use(protectRoute, restrictTo("admin"));

router.get("/", getAllOrders);
router.get("/stats", getOrderStats);
router.get("/search", searchOrders);
router.get("/:id", getOrderDetails);
router.get("/:id/invoice", generateInvoice);
router.patch("/:id/status", updateOrderStatus);

export default router;
