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
} from "./booking.controller";
import {
  protect,
  restrictTo,
} from "../../middlewares/authorization.middleware";

import { validateAddressBody } from "../../middlewares/validate.middleware";

const router = express.Router();

// Protect all routes after this middleware

router.use(protect);
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

  validateAddressBody, // optional but recommended
  updateShippingAddress
);

// PATCH /api/bookings/:id/billing-address
router.patch(
  "/:id/billing-address",

  validateAddressBody, // optional but recommended
  updateBillingAddress
);
// Admin only routes
router.use(restrictTo("admin"));

// Add admin-only booking routes here if needed

export default router;
