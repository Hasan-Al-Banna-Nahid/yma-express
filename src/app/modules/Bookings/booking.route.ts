// booking.routes.ts
import express from "express";
import {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
  updateBookingStatus,
  getBookingStats,
} from "./booking.controller";
import { protectRoute } from "../../middlewares/auth.middleware";
import { restrictTo } from "../../middlewares/authorization.middleware";

const router = express.Router();

// User routes
router.post("/", protectRoute, createBooking);
router.get("/my-bookings", protectRoute, getMyBookings);
router.get("/:id", protectRoute, getBookingById);
router.post("/:id/cancel", protectRoute, cancelBooking);

// Admin routes
router.get(
  "/admin/all",
  protectRoute,
  restrictTo("admin", "superadmin"),
  getAllBookings
);
router.patch(
  "/admin/:id",
  protectRoute,
  restrictTo("admin", "superadmin"),
  updateBookingStatus
);
router.get(
  "/admin/stats",
  protectRoute,
  restrictTo("admin", "superadmin"),
  getBookingStats
);

export default router;
