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
router.use(restrictTo("admin", "superadmin"));

router.get("/admin/bookings", getAllBookings);
router.patch("/admin/bookings/:id", updateBookingStatus);
router.get("/admin/bookings/stats", getBookingStats);
router.get("/admin/bookings/upcoming-deliveries", getUpcomingDeliveries);
router.get("/admin/bookings/search", searchBookings);

export default router;
