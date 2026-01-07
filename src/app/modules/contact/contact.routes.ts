import express from "express";
import {
  submitContact,
  getContacts,
  getContact,
  updateContactStatus,
} from "./contact.controller";

const router = express.Router();

// Public routes
router.post("/contact", submitContact);

// Admin routes (you might want to add authentication middleware)
router.get("/contacts", getContacts);
router.get("/contacts/:id", getContact);
router.patch("/contacts/:id/status", updateContactStatus);

export default router;
