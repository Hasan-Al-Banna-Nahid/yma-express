"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const booking_controller_1 = require("../controllers/booking.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const router = express_1.default.Router();
// Protect all routes after this middleware
router.use(auth_middleware_1.protectRoute);
router.post("/", booking_controller_1.createBookingHandler);
router.get("/", booking_controller_1.getBookingsHandler);
router.get("/date-range", booking_controller_1.getBookingsByDateRangeHandler);
router.get("/product/:productId", booking_controller_1.getBookingsByProductHandler);
router.get("/check-availability", booking_controller_1.checkAvailabilityHandler);
router.get("/:id", booking_controller_1.getBookingHandler);
router.patch("/:id", booking_controller_1.updateBookingHandler);
router.delete("/:id", booking_controller_1.deleteBookingHandler);
router.patch("/:id/shipping-address", auth_middleware_1.protectRoute, validate_middleware_1.validateAddressBody, // optional but recommended
booking_controller_1.updateShippingAddress);
// PATCH /api/bookings/:id/billing-address
router.patch("/:id/billing-address", auth_middleware_1.protectRoute, validate_middleware_1.validateAddressBody, // optional but recommended
booking_controller_1.updateBillingAddress);
// Admin only routes
router.use((0, auth_middleware_1.restrictTo)("admin"));
// Add admin-only booking routes here if needed
exports.default = router;
