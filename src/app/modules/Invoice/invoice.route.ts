// src/app/modules/Invoice/invoice.route.ts
import express from "express";
import {
  createInvoice,
  getInvoice,
  getInvoices,
  getInvoicesByBooking,
  updateInvoice,
  deleteInvoice,
  generateCustomInvoice,
  getInvoicesByUser,
  updateInvoiceStatus,
} from "./invoice.controller"; // Import from same folder
import { protectRoute } from "../../middlewares/auth.middleware";
import { restrictTo } from "../../middlewares/authorization.middleware";

const router = express.Router();

// Protect all routes after this middleware
router.use(protectRoute);

// All these routes require authentication

router
  .route("/")
  .post(restrictTo("admin", "superadmin", "editor"), createInvoice)
  .get(restrictTo("admin", "superadmin", "editor"), getInvoices);

// User can get their own invoices
router.get("/user/:userId?", getInvoicesByUser);

router.get(
  "/booking/:bookingId",
  restrictTo("admin", "superadmin", "editor"),
  getInvoicesByBooking
);

router.post(
  "/generate-custom",
  restrictTo("admin", "superadmin"),
  generateCustomInvoice
);

router
  .route("/:id")
  .get(restrictTo("admin", "superadmin", "editor"), getInvoice)
  .patch(restrictTo("admin", "superadmin", "editor"), updateInvoice)
  .delete(restrictTo("admin", "superadmin"), deleteInvoice);

// Update invoice status
router.patch(
  "/:id/status",
  restrictTo("admin", "superadmin", "editor"),
  updateInvoiceStatus
);

export default router;
