// src/controllers/mail.controller.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "../../utils/asyncHandler";
import ApiError from "../../utils/apiError";
import { sendPlainMail, EMAIL_FROM } from "../Email/email.service"; // Import EMAIL_FROM

export const sendMailController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, subject, message } =
      req.body as {
        name?: string;
        email?: string; // sender email (will be Reply-To)
        subject?: string;
        message?: string;
      };

    if (!email || !subject || !message) {
      throw new ApiError("Email, subject, and message are required", 400);
    }

    // Recipient is always internal (can be configured via env var CONTACT_FORM_RECIPIENT_EMAIL)
    const recipient = process.env.CONTACT_FORM_RECIPIENT_EMAIL || EMAIL_FROM;

    // Basic email checks
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email))) {
      throw new ApiError("Invalid sender email format", 400);
    }
    if (subject.length > 200) {
      throw new ApiError("Subject too long (max 200 chars)", 400);
    }
    if (message.length > 10000) {
      throw new ApiError("Message too long (max 10k chars)", 400);
    }

    await sendPlainMail({
      to: recipient,
      subject: `Contact Form: ${subject.trim()}`, // Prefix subject for clarity
      message: message.trim(),
      senderName: name?.trim(),
      senderEmail: email?.trim(),
      // fromEmail and fromName are not passed from client for this public form
      // The actual 'From' header will be `EMAIL_FROM` from the service configuration.
      // The `senderEmail` will be used for Reply-To.
    });

    res.status(200).json({
      status: "success",
      message: "Message sent successfully",
    });
  }
);
