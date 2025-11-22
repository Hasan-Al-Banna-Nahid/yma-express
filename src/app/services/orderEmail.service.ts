// src/services/orderEmail.service.ts
import { IOrderModel } from "../models/order.model";
import {
  sendOrderConfirmationEmail,
  sendDeliveryReminderEmail,
  sendPreDeliveryConfirmationEmail,
  sendInvoiceEmail,
} from "./email.service";

// Re-export the email functions
export {
  sendOrderConfirmationEmail,
  sendDeliveryReminderEmail,
  sendPreDeliveryConfirmationEmail,
  sendInvoiceEmail,
};

// Additional order email logic can be added here
export const getOrdersForDeliveryReminders = async (): Promise<
  IOrderModel[]
> => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const Order = (await import("../models/order.model")).default;

  return await Order.find({
    status: { $in: ["confirmed", "shipped"] },
    estimatedDeliveryDate: {
      $gte: tomorrow,
      $lt: dayAfterTomorrow,
    },
  })
    .populate("user", "name email")
    .populate("items.product");
};
