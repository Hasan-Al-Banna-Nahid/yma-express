import { Request, Response, NextFunction } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as newsletterService from "./newsletter.service";

// Subscribe to newsletter
export const subscribe = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email is required",
      });
    }

    const newsletter = await newsletterService.subscribe({
      email,
    });

    res.status(201).json({
      status: "success",
      message: "Successfully subscribed to newsletter!",
      data: {
        newsletter: {
          id: newsletter._id,
          email: newsletter.email,
          subscribedAt: newsletter.subscribedAt,
        },
      },
    });
  }
);

// Unsubscribe from newsletter
export const unsubscribe = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email is required",
      });
    }

    const newsletter = await newsletterService.unsubscribe(email);

    if (!newsletter) {
      return res.status(404).json({
        status: "error",
        message: "Email not found in our subscribers list",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Successfully unsubscribed from newsletter",
      data: {
        newsletter: {
          email: newsletter.email,
          unsubscribedAt: newsletter.unsubscribedAt,
        },
      },
    });
  }
);

// Get all subscribers (admin)
export const getSubscribers = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { active } = req.query;
    const activeOnly = active === "false" ? false : true;

    const subscribers = await newsletterService.getAllSubscribers(activeOnly);
    const count = await newsletterService.getSubscriberCount(activeOnly);

    res.status(200).json({
      status: "success",
      results: count,
      data: { subscribers },
    });
  }
);

// Send newsletter (admin)
export const sendNewsletter = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { subject, content, title, previewText } = req.body;

    if (!subject || !content) {
      return res.status(400).json({
        status: "error",
        message: "Subject and content are required",
      });
    }

    const result = await newsletterService.sendNewsletter({
      subject,
      content,
      title,
      previewText,
    });

    res.status(200).json({
      status: "success",
      message: `Newsletter sent successfully to ${result.sent} subscribers`,
      data: result,
    });
  }
);

// Get subscriber count (admin)
export const getCount = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { active } = req.query;
    const activeOnly = active === "false" ? false : true;

    const count = await newsletterService.getSubscriberCount(activeOnly);

    res.status(200).json({
      status: "success",
      data: { count },
    });
  }
);
