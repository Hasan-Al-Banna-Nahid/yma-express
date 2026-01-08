import express from "express";
import { createOrder, checkStock } from "./checkout.controller"; // Import checkStock
import { protectRoute } from "../../middlewares/auth.middleware";

const router = express.Router();

// All checkout routes require authentication
router.use(protectRoute);

// POST /api/v1/checkout - Create new order
router.post("/", createOrder);

// GET /api/v1/checkout/stock - Check stock for cart items
router.get("/stock", checkStock);

export default router;
