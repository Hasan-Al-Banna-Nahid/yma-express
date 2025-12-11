import express from "express";
import * as adminController from "./admin.controller";
import * as authController from "../Auth/auth.controller";
import {
  restrictTo,
  canManageUser,
} from "../../middlewares/authorization.middleware";
import { upload } from "../../utils/cloudinary.util";

const router = express.Router();

// Protect all admin routes
router.use(authController.protectRoute);

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

export default router;
