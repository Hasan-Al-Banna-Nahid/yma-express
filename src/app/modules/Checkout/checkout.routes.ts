import express from "express";
import {
  createOrder,
  checkStock,
  checkDateAvailability,
  getAvailableDates,
} from "./checkout.controller";
import { protectRoute } from "../../middlewares/auth.middleware";

const router = express.Router();

// All checkout routes require authentication
router.use(protectRoute);

// POST /api/v1/checkout - Create new order
router.post("/", createOrder);

// GET /api/v1/checkout/stock - Check stock for cart items
router.get("/stock", checkStock);

// POST /api/v1/checkout/check-availability - Check date availability
router.post("/check-availability", checkDateAvailability);

// GET /api/v1/checkout/available-dates/:productId - Get available dates for a product
router.get("/available-dates/:productId", getAvailableDates);

export default router;
