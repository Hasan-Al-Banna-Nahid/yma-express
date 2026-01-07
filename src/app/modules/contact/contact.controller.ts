import { Request, Response, NextFunction } from "express";
import asyncHandler from "../../utils/asyncHandler";
// ✅ CORRECTED: Import from correct location
import * as contactService from "./contact.service";

export const submitContact = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { firstName, lastName, email, phoneNumber, message } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({
        status: "error",
        message: "First name, last name, email, and message are required",
      });
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "Please provide a valid email address",
      });
    }

    // ✅ CORRECTED: Use imported function
    const contact = await contactService.createContact({
      firstName,
      lastName,
      email,
      phoneNumber,
      message,
    });

    res.status(201).json({
      status: "success",
      message: "Thank you for your message. We will contact you soon!",
      data: {
        contact: {
          id: contact._id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          createdAt: contact.createdAt,
        },
      },
    });
  }
);

export const getContacts = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // ✅ CORRECTED: Use imported function
    const contacts = await contactService.getAllContacts();

    res.status(200).json({
      status: "success",
      results: contacts.length,
      data: { contacts },
    });
  }
);

export const getContact = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    // ✅ CORRECTED: Use imported function
    const contact = await contactService.getContactById(id);

    if (!contact) {
      return res.status(404).json({
        status: "error",
        message: "Contact not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: { contact },
    });
  }
);

export const updateContactStatus = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { action } = req.body;

    let updatedContact;

    // ✅ CORRECTED: Use imported functions
    if (action === "read") {
      updatedContact = await contactService.markAsRead(id);
    } else if (action === "responded") {
      updatedContact = await contactService.markAsResponded(id);
    } else {
      return res.status(400).json({
        status: "error",
        message: 'Invalid action. Use "read" or "responded"',
      });
    }

    if (!updatedContact) {
      return res.status(404).json({
        status: "error",
        message: "Contact not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: `Contact marked as ${action}`,
      data: { contact: updatedContact },
    });
  }
);
