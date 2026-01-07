import express from "express";
import {
  subscribe,
  unsubscribe,
  getSubscribers,
  sendNewsletter,
  getCount,
} from "./newsletter.controller";

const router = express.Router();

// Public routes
router.post("/newsletter/subscribe", subscribe);
router.post("/newsletter/unsubscribe", unsubscribe);

// Admin routes (add authentication middleware if needed)
router.get("/newsletter/subscribers", getSubscribers);
router.get("/newsletter/count", getCount);
router.post("/newsletter/send", sendNewsletter);

export default router;
