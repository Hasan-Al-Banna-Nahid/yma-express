import express from "express";
import * as adminController from "./admin.controller";
import { protectRoute } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/role.middleware";
import { upload } from "../../utils/cloudinary.util";
import { updateAdminSettings } from "./admin.controller";

const router = express.Router();

// Protect all admin routes
router.use(protectRoute);
router.use(isAdmin);
router.put(
  "/settings",
  upload.array("photo", 1), // Accept single file with field name 'photo'
  updateAdminSettings,
);
// ==================== USER MANAGEMENT ====================
router.get("/users", adminController.getAllUsers);
router.get("/users/:id", adminController.getUserById);
router.post("/users", upload.single("photo"), adminController.createUser);
router.patch("/users/:id", upload.single("photo"), adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);
router.patch("/users/:id/activate", adminController.activateUser);
router.patch("/users/:id/password", adminController.changeUserPassword);

// ==================== ROLE MANAGEMENT ====================
router.patch("/users/:id/role", adminController.changeUserRole);
router.post("/users/bulk-roles", adminController.bulkChangeRoles);
router.get("/users/role/:role", adminController.getUsersByRole);
router.get("/stats/roles", adminController.getRoleStats);

// ==================== STATISTICS ====================
router.get("/stats", adminController.getSystemStats);
router.get("/stats/activity", adminController.getUserActivity);
// ==================== ORDER STATISTICS ====================
router.get("/stats/orders", adminController.getOrderStatistics);
router.get("/dashboard/summary", adminController.getDashboardSummary);
export default router;
