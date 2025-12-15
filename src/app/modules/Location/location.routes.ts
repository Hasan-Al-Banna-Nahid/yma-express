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

// Dynamic CRUD routes
router
  .route("/")
  .post(restrictTo("superadmin", "admin", "editor"), createLocationHandler)
  .get(getLocationsHandler);

router
  .route("/:id")
  .get(getLocationHandler)
  .patch(restrictTo("superadmin", "admin", "editor"), updateLocationHandler)
  .delete(restrictTo("superadmin", "admin", "editor"), deleteLocationHandler);

export default router;
