import express from "express";
import {
  createInventoryItemHandler,
  getInventoryItemHandler,
  getInventoryItemsHandler,
  updateInventoryItemHandler,
  deleteInventoryItemHandler,
  getAvailableInventoryHandler,
  getBookedInventoryHandler,
  checkInventoryAvailabilityHandler,
  releaseExpiredCartItemsHandler,
  checkProductAvailabilityHandler,
} from "./inventory.controller";
import { protectRoute } from "../../middlewares/auth.middleware";
import { restrictTo } from "../../middlewares/authorization.middleware";

const router = express.Router();

// Public routes
router.post("/check-availability", checkProductAvailabilityHandler);

// Protected routes
router.use(protectRoute);

// Admin only routes
router.use(restrictTo("admin", "superadmin"));

router.post("/", createInventoryItemHandler);
router.get("/", getInventoryItemsHandler);
router.get("/available", getAvailableInventoryHandler);
router.get("/booked", getBookedInventoryHandler);
router.get("/check", checkInventoryAvailabilityHandler);
router.get("/release-expired", releaseExpiredCartItemsHandler);
router.get("/:id", getInventoryItemHandler);
router.patch("/:id", updateInventoryItemHandler);
router.delete("/:id", deleteInventoryItemHandler);

export default router;
