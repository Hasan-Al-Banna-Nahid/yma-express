import express from "express";
import {
  createLocationHandler,
  getLocationsHandler,
  getLocationHandler,
  updateLocationHandler,
  deleteLocationHandler,
  checkDeliveryHandler,
  getDeliveryAreasTreeHandler,
} from "./location.controller";
import { restrictTo } from "../../middlewares/authorization.middleware";
import { protectRoute } from "../../middlewares/auth.middleware";

const router = express.Router();

// Public routes
router.get("/", getLocationsHandler); // Get all locations with filters
router.get("/delivery/check", checkDeliveryHandler); // Check delivery availability
router.get("/delivery/tree", getDeliveryAreasTreeHandler); // Get delivery areas tree
router.get("/:id", getLocationHandler); // Get location by ID

// Protected routes
router.use(protectRoute);

router.post(
  "/",
  restrictTo("superadmin", "admin", "editor"),
  createLocationHandler
);
router.patch(
  "/:id",
  restrictTo("superadmin", "admin", "editor"),
  updateLocationHandler
);
router.delete("/:id", restrictTo("superadmin", "admin"), deleteLocationHandler);

export default router;
