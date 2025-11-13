import express from "express";
import {
  createBookingHandler,
  getBookingHandler,
  getBookingsHandler,
  getBookingsByDateRangeHandler,
  updateBookingHandler,
  deleteBookingHandler,
  getBookingsByProductHandler,
  checkAvailabilityHandler,
  updateBillingAddress,
  updateShippingAddress,
} from "../controllers/booking.controller";
import { protectRoute, restrictTo } from "../middlewares/auth.middleware";
import { protect } from "../services/auth.service";
import { validateAddressBody } from "../middlewares/validate.middleware";

const router = express.Router();

// Protect all routes after this middleware
router.use(protectRoute);

router.post("/", createBookingHandler);
router.get("/", getBookingsHandler);
router.get("/date-range", getBookingsByDateRangeHandler);
router.get("/product/:productId", getBookingsByProductHandler);
router.get("/check-availability", checkAvailabilityHandler);
router.get("/:id", getBookingHandler);
router.patch("/:id", updateBookingHandler);
router.delete("/:id", deleteBookingHandler);
router.patch(
  "/:id/shipping-address",
  protectRoute,
  validateAddressBody, // optional but recommended
  updateShippingAddress
);

// PATCH /api/bookings/:id/billing-address
router.patch(
  "/:id/billing-address",
  protectRoute,
  validateAddressBody, // optional but recommended
  updateBillingAddress
);
// Admin only routes
router.use(restrictTo("admin"));

// Add admin-only booking routes here if needed

export default router;
