import express from "express";
import {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
  updateBookingStatus,
  getBookingStats,
  getUpcomingDeliveries,
  searchBookings,
} from "./booking.controller";
import { protectRoute } from "../../middlewares/auth.middleware";
import { restrictTo } from "../../middlewares/authorization.middleware";

const router = express.Router();

// Public routes (none)

// Protected routes (User)
router.use(protectRoute);

// User booking routes
router.post("/", createBooking);
router.get("/my-bookings", getMyBookings);
router.get("/:id", getBookingById);
router.post("/:id/cancel", cancelBooking);

// Admin routes
router.get(
  "/admin",
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
router.get(
  "/admin/upcoming-deliveries",
  protectRoute,
  restrictTo("admin", "superadmin"),
  getUpcomingDeliveries
);
router.get(
  "/admin/search",
  protectRoute,
  restrictTo("admin", "superadmin"),
  searchBookings
);

export default router;
