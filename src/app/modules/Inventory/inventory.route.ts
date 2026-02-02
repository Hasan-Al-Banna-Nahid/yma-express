import express from "express";
import {
  createInventoryItemHandler,
  getInventoryItemHandler,
  getInventoryItemsHandler,
  updateInventoryItemHandler,
  deleteInventoryItemHandler,
  getAvailableInventoryHandler,
  getBookedInventoryHandler,
  // releaseExpiredCartItemsHandler,
  checkInventoryAvailabilityHandler,
} from "./inventory.controller";
import { protectRoute } from "../../middlewares/auth.middleware";
import { restrictTo } from "../../middlewares/authorization.middleware";
import { upload } from "../../utils/cloudinary.util";

const router = express.Router();

// Public routes
router.post("/check-availability", checkInventoryAvailabilityHandler);

// Protected routes
router.use(protectRoute);

// Admin only routes
router.use(restrictTo("admin", "superadmin"));

router.post("/", upload.array("images", 10), createInventoryItemHandler); // Max 10 images
router.get("/", getInventoryItemsHandler);
router.get("/available", getAvailableInventoryHandler);
router.get("/booked", getBookedInventoryHandler);
router.get("/check", checkInventoryAvailabilityHandler);
// router.get("/release-expired", releaseExpiredCartItemsHandler);
router.get("/:id", getInventoryItemHandler);
router.patch("/:id", upload.array("images", 10), updateInventoryItemHandler);
router.delete("/:id", deleteInventoryItemHandler);

export default router;
