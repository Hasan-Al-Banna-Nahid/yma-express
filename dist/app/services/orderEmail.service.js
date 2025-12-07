"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrdersForDeliveryReminders = exports.sendInvoiceEmail = exports.sendPreDeliveryConfirmationEmail = exports.sendDeliveryReminderEmail = exports.sendOrderConfirmationEmail = void 0;
const email_service_1 = require("./email.service");
Object.defineProperty(exports, "sendOrderConfirmationEmail", { enumerable: true, get: function () { return email_service_1.sendOrderConfirmationEmail; } });
Object.defineProperty(exports, "sendDeliveryReminderEmail", { enumerable: true, get: function () { return email_service_1.sendDeliveryReminderEmail; } });
Object.defineProperty(exports, "sendPreDeliveryConfirmationEmail", { enumerable: true, get: function () { return email_service_1.sendPreDeliveryConfirmationEmail; } });
Object.defineProperty(exports, "sendInvoiceEmail", { enumerable: true, get: function () { return email_service_1.sendInvoiceEmail; } });
// Additional order email logic can be added here
const getOrdersForDeliveryReminders = async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const Order = (await Promise.resolve().then(() => __importStar(require("../models/order.model")))).default;
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
exports.getOrdersForDeliveryReminders = getOrdersForDeliveryReminders;
