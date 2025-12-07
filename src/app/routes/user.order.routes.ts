import express from "express";
import { getMyOrders, getMyOrder } from "../controllers/user.order.controller";
import { protectRoute } from "../middlewares/auth.middleware";

const router = express.Router();

// All user order routes require authentication
router.use(protectRoute);

// GET /api/v1/orders/my-orders - Get user's orders
router.get("/my-orders", getMyOrders);

// GET /api/v1/orders/:id - Get specific order by ID (user's own order)
router.get("/:id", getMyOrder);

export default router;
