// src/services/cron.service.ts
import cron from "node-cron";
import { getOrdersForDeliveryReminders } from "./orderEmail.service";
import {
  sendDeliveryReminderEmail,
  sendPreDeliveryConfirmationEmail,
} from "./email.service";

export function setupDeliveryReminders(): void {
  // Run every day at 9 AM
  cron.schedule("0 9 * * *", async () => {
    console.log("⏰ Running delivery reminder cron job...");

    try {
      const orders = await getOrdersForDeliveryReminders();

      for (const order of orders) {
        const deliveryDate = order.estimatedDeliveryDate;
        const today = new Date();
        const daysUntilDelivery = Math.ceil(
          (deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilDelivery === 2) {
          await sendDeliveryReminderEmail(order);
        } else if (daysUntilDelivery === 1) {
          await sendPreDeliveryConfirmationEmail(order);
        }
      }

      console.log(`✅ Sent reminders for ${orders.length} orders`);
    } catch (error) {
      console.error("❌ Delivery reminder cron job failed:", error);
    }
  });
}
