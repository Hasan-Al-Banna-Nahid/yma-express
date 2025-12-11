import express from "express";
import { createOrder } from "./checkout.controller";
import { protectRoute } from "../../middlewares/auth.middleware";

const router = express.Router();

// All checkout routes require authentication
router.use(protectRoute);

// POST /api/v1/checkout - Create new order
router.post("/", createOrder);

export default router;
