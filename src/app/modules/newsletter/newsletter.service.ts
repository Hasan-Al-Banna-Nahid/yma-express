import Newsletter, { INewsletter } from "./NewsLetter.model";
import {
  sendWelcomeEmail,
  sendNewsletterEmail,
} from "./newsletteremail.service";

export interface SubscribeData {
  email: string;
  name?: string;
  source?: string;
}

export interface NewsletterData {
  subject: string;
  content: string;
  title?: string;
  previewText?: string;
}

// Subscribe to newsletter
export const subscribe = async (data: SubscribeData): Promise<INewsletter> => {
  // Validate email
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(data.email)) {
    throw new Error("Please provide a valid email address");
  }

  // Check if already subscribed
  const existing = await Newsletter.findOne({
    email: data.email.toLowerCase(),
  });

  if (existing) {
    if (existing.isActive) {
      throw new Error("Email is already subscribed");
    }
    // Reactivate if previously unsubscribed
    existing.isActive = true;
    existing.unsubscribedAt = undefined;
    await existing.save();
    return existing;
  }

  // Create new subscription
  const newsletter = await Newsletter.create({
    email: data.email.toLowerCase(),
    name: data.name,
    source: data.source || "website",
    isActive: true,
    subscribedAt: new Date(),
  });

  // Send welcome email
  try {
    await sendWelcomeEmail(data.email, data.name);
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    // Don't fail subscription if email fails
  }

  return newsletter;
};

// Unsubscribe from newsletter
export const unsubscribe = async (
  email: string
): Promise<INewsletter | null> => {
  const newsletter = await Newsletter.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      isActive: false,
      unsubscribedAt: new Date(),
    },
    { new: true }
  );

  return newsletter;
};

// Get all subscribers (active)
export const getAllSubscribers = async (
  activeOnly: boolean = true
): Promise<INewsletter[]> => {
  const query = activeOnly ? { isActive: true } : {};
  return await Newsletter.find(query).sort({ subscribedAt: -1 });
};

// Get subscriber count
export const getSubscriberCount = async (
  activeOnly: boolean = true
): Promise<number> => {
  const query = activeOnly ? { isActive: true } : {};
  return await Newsletter.countDocuments(query);
};

// Send newsletter to all active subscribers
export const sendNewsletter = async (
  newsletterData: NewsletterData
): Promise<{ sent: number; failed: number }> => {
  const subscribers = await getAllSubscribers(true);

  if (subscribers.length === 0) {
    throw new Error("No active subscribers found");
  }

  let sent = 0;
  let failed = 0;

  // Send emails to all subscribers
  for (const subscriber of subscribers) {
    try {
      await sendNewsletterEmail(
        subscriber.email,
        subscriber.name,
        newsletterData
      );
      sent++;
    } catch (error) {
      console.error(`Failed to send to ${subscriber.email}:`, error);
      failed++;
    }
  }

  return { sent, failed };
};
