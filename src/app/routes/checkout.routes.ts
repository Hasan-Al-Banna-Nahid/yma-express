import express from "express";
import {
  createOrder,
  getOrder,
  getMyOrders,
} from "../controllers/checkout.controller";
import { protectRoute } from "../middlewares/auth.middleware";

const router = express.Router();

// All checkout routes require authentication
router.use(protectRoute);

// POST /api/v1/checkout/order - Create new order
router.post("/order", createOrder);

// GET /api/v1/checkout/my-orders - Get user's orders
router.get("/my-orders", getMyOrders);

// GET /api/v1/checkout/order/:id - Get specific order by ID
router.get("/order/:id", getOrder);

export default router;
