// src/routes/location.routes.ts
import express from "express";
import {
  createLocationHandler,
  getLocationsHandler,
  getLocationHandler,
  updateLocationHandler,
  deleteLocationHandler,
} from "./location.controller";
import { restrictTo } from "../../middlewares/authorization.middleware";
import { protectRoute } from "../../middlewares/auth.middleware";

const router = express.Router();

// Public routes
router.get("/", getLocationsHandler); // Get all locations
router.get("/:id", getLocationHandler); // Get location by ID

// Protected routes (require authentication and authorization)
router.use(protectRoute); // All routes below this require authentication

router
  .route("/")
  .post(restrictTo("superadmin", "admin", "editor"), createLocationHandler);

router
  .route("/:id")
  .patch(restrictTo("superadmin", "admin", "editor"), updateLocationHandler)
  .delete(restrictTo("superadmin", "admin", "editor"), deleteLocationHandler);

export default router;
