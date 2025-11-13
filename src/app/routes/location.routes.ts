// src/routes/location.routes.ts
import express from "express";
import * as locationController from "../controllers/location.controller";
import { protectRoute, restrictTo } from "../middlewares/auth.middleware";

const router = express.Router();

// Public routes
router.get("/", locationController.getLocations);
router.get("/hierarchy", locationController.getLocationHierarchy);
router.get("/type/:type", locationController.getLocationsByType);
router.get("/parent/:parentId", locationController.getLocationsByParent);
router.get("/nearby", locationController.getNearbyLocations);
router.get("/:id", locationController.getLocation);

// Protected routes (Admin only)
router.use(protectRoute, restrictTo("admin"));

router.post("/", locationController.createLocation);
router.patch("/:id", locationController.updateLocation);
router.delete("/:id", locationController.deleteLocation);

export default router;
