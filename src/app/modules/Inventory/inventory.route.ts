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
} from "./inventory.controller";
import { protectRoute } from "../../middlewares/auth.middleware";
import { restrictTo } from "../../middlewares/authorization.middleware";

const router = express.Router();

// Protect all routes
router.use(protectRoute);

// Admin only routes
router.use(restrictTo("admin", "superadmin"));

router.post("/", createInventoryItemHandler);
router.get("/", getInventoryItemsHandler);
router.get("/available", getAvailableInventoryHandler);
router.get("/booked", getBookedInventoryHandler);
router.get("/check-availability", checkInventoryAvailabilityHandler);
router.get("/release-expired", releaseExpiredCartItemsHandler);
router.get("/:id", getInventoryItemHandler);
router.patch("/:id", updateInventoryItemHandler);
router.delete("/:id", deleteInventoryItemHandler);

export default router;
