import express from "express";
import * as adminController from "./admin.controller";
import * as orderController from "./order.controller";
import { protectRoute } from "../../middlewares/auth.middleware"; // Correct import for protectRoute
import {
  restrictTo,
  canManageUser,
} from "../../middlewares/authorization.middleware"; // Removed redundant protect import
import { upload } from "../../utils/cloudinary.util";

const router = express.Router();

// Protect all admin routes
router.use(protectRoute); // Now correctly uses the central protectRoute
// Get system stats - superadmin & admin only
router.get(
  "/stats",
  restrictTo("superadmin", "admin"),
  adminController.getSystemStats
);

// User management routes
router.get(
  "/users",
  restrictTo("superadmin", "admin"),
  adminController.getAllUsers
);
router.get(
  "/users/:id",
  restrictTo("superadmin", "admin"),
  canManageUser,
  adminController.getUserById
);
router.post(
  "/users",
  restrictTo("superadmin", "admin"),
  upload.single("photo"),
  adminController.createUser
);
router.patch(
  "/users/:id",
  restrictTo("superadmin", "admin"),
  canManageUser,
  upload.single("photo"),
  adminController.updateUser
);
router.delete(
  "/users/:id",
  restrictTo("superadmin", "admin"),
  canManageUser,
  adminController.deleteUser
);
router.post(
  "/users/change-role",
  restrictTo("superadmin"),
  adminController.changeUserRole
);

// Order management routes
router.get(
  "/orders",
  restrictTo("superadmin", "admin"),
  orderController.getAllOrders
);
router.get(
  "/orders/stats",
  restrictTo("superadmin", "admin"),
  orderController.getOrderStats
);
router.get(
  "/orders/search",
  restrictTo("superadmin", "admin"),
  orderController.searchOrders
);
router.get(
  "/orders/delivery-reminders",
  restrictTo("superadmin", "admin"),
  orderController.getDeliveryReminderOrders
);
router.post(
  "/orders/send-delivery-reminders",
  restrictTo("superadmin", "admin"),
  orderController.sendDeliveryReminders
);
router.get(
  "/orders/:id",
  restrictTo("superadmin", "admin"),
  orderController.getOrderById
);
router.post(
  "/orders",
  restrictTo("superadmin", "admin"),
  orderController.createOrder
);
router.patch(
  "/orders/:id",
  restrictTo("superadmin", "admin"),
  orderController.updateOrder
);
router.patch(
  "/orders/:id/status",
  restrictTo("superadmin", "admin"),
  orderController.updateOrderStatus
);
router.delete(
  "/orders/:id",
  restrictTo("superadmin", "admin"),
  orderController.deleteOrder
);

export default router;
