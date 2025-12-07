"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDeliveryReminders = setupDeliveryReminders;
// src/services/cron.service.ts
const node_cron_1 = __importDefault(require("node-cron"));
const orderEmail_service_1 = require("./orderEmail.service");
const email_service_1 = require("./email.service");
function setupDeliveryReminders() {
    // Run every day at 9 AM
    node_cron_1.default.schedule("0 9 * * *", async () => {
        console.log("⏰ Running delivery reminder cron job...");
        try {
            const orders = await (0, orderEmail_service_1.getOrdersForDeliveryReminders)();
            for (const order of orders) {
                const deliveryDate = order.estimatedDeliveryDate;
                const today = new Date();
                const daysUntilDelivery = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                if (daysUntilDelivery === 2) {
                    await (0, email_service_1.sendDeliveryReminderEmail)(order);
                }
                else if (daysUntilDelivery === 1) {
                    await (0, email_service_1.sendPreDeliveryConfirmationEmail)(order);
                }
            }
            console.log(`✅ Sent reminders for ${orders.length} orders`);
        }
        catch (error) {
            console.error("❌ Delivery reminder cron job failed:", error);
        }
    });
}
