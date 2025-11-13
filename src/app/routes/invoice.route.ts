import express from "express";

import {
    createInvoiceHandler,
    getInvoiceHandler,
    getInvoicesHandler,
    getInvoicesByBookingHandler,
    updateInvoiceHandler,
    deleteInvoiceHandler,
    generateInvoiceForBookingHandler,
    generateCustomInvoiceHandler,
} from '../controllers/invoice.controller';
import { protectRoute, restrictTo } from '../middlewares/auth.middleware';

const router = express.Router();

// Protect all routes after this middleware
router.use(protectRoute);

router.post("/", createInvoiceHandler);
router.get("/", getInvoicesHandler);
router.get("/booking/:bookingId", getInvoicesByBookingHandler);
router.post("/generate/:bookingId", generateInvoiceForBookingHandler);
router.post("/generate-custom", generateCustomInvoiceHandler);
router.get("/:id", getInvoiceHandler);
router.patch("/:id", updateInvoiceHandler);
router.delete("/:id", deleteInvoiceHandler);

// Admin only routes
router.use(restrictTo('admin'));

// Add admin-only invoice routes here if needed

export default router;