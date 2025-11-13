import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { sendPlainMail } from "../services/email.service";

export const sendMailController = asyncHandler(async (req, res) => {
  const { name, email, to, subject, message, fromEmail, fromName } =
    req.body as {
      name?: string;
      email?: string; // sender email (will be Reply-To)
      to?: string; // recipient (can hardcode if you want)
      subject?: string;
      message?: string;
      fromEmail?: string; // OPTIONAL override (must be verified in SendGrid)
      fromName?: string; // OPTIONAL override
    };

  if (!subject || !message) {
    throw new ApiError("subject and message are required", 400);
  }

  // If you want the recipient hardcoded:
  const recipient = to && to.trim() ? to.trim() : "Iamnahid591998@gmail.com";

  // Basic email checks (loose)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(String(email))) {
    throw new ApiError("Invalid sender email", 400);
  }
  if (!emailRegex.test(recipient)) {
    throw new ApiError("Invalid recipient email", 400);
  }
  if (subject.length > 200) {
    throw new ApiError("Subject too long (max 200 chars)", 400);
  }
  if (message.length > 10000) {
    throw new ApiError("Message too long (max 10k chars)", 400);
  }

  await sendPlainMail({
    to: recipient,
    subject: subject.trim(),
    message: message.trim(),
    senderName: name?.trim(),
    senderEmail: email?.trim(),
    fromEmail: fromEmail?.trim(), // optional override (must be verified)
    fromName: fromName?.trim(),
  });

  return ApiResponse(res, 200, "Message sent");
});
