"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMailController = void 0;
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const apiResponse_1 = require("../utils/apiResponse");
const email_service_1 = require("../services/email.service");
exports.sendMailController = (0, asyncHandler_1.default)(async (req, res) => {
    const { name, email, to, subject, message, fromEmail, fromName } = req.body;
    if (!subject || !message) {
        throw new apiError_1.default("subject and message are required", 400);
    }
    // If you want the recipient hardcoded:
    const recipient = to && to.trim() ? to.trim() : "Iamnahid591998@gmail.com";
    // Basic email checks (loose)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(String(email))) {
        throw new apiError_1.default("Invalid sender email", 400);
    }
    if (!emailRegex.test(recipient)) {
        throw new apiError_1.default("Invalid recipient email", 400);
    }
    if (subject.length > 200) {
        throw new apiError_1.default("Subject too long (max 200 chars)", 400);
    }
    if (message.length > 10000) {
        throw new apiError_1.default("Message too long (max 10k chars)", 400);
    }
    await (0, email_service_1.sendPlainMail)({
        to: recipient,
        subject: subject.trim(),
        message: message.trim(),
        senderName: name?.trim(),
        senderEmail: email?.trim(),
        fromEmail: fromEmail?.trim(), // optional override (must be verified)
        fromName: fromName?.trim(),
    });
    return (0, apiResponse_1.ApiResponse)(res, 200, "Message sent");
});
