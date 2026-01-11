import express from "express";
import {
  createLocationHandler,
  getLocationsHandler,
  getLocationHandler,
  updateLocationHandler,
  deleteLocationHandler,
  addDeliveryAreaHandler,
  updateDeliveryAreaHandler,
  deleteDeliveryAreaHandler,
  getDeliveryAreaHandler,
  checkDeliveryHandler,
  getDeliveryHierarchyHandler,
} from "./location.controller";

const router = express.Router();

// Public routes
router.get("/", getLocationsHandler);
router.get("/hierarchy", getDeliveryHierarchyHandler);
router.get("/delivery/check", checkDeliveryHandler);
router.get("/:id", getLocationHandler);
router.get("/:id/delivery-areas/:areaId", getDeliveryAreaHandler);

// Protected routes (add your auth middleware here)
router.post("/", createLocationHandler);
router.patch("/:id", updateLocationHandler);
router.delete("/:id", deleteLocationHandler);
router.post("/:id/delivery-areas", addDeliveryAreaHandler);
router.patch("/:id/delivery-areas/:areaId", updateDeliveryAreaHandler);
router.delete("/:id/delivery-areas/:areaId", deleteDeliveryAreaHandler);

export default router;
