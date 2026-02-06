import dotenv from "dotenv";

dotenv.config();

type EmailAddress = string | { email: string; name?: string };

interface SendMailOptions {
  from?: EmailAddress;
  to?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
}

interface ParsedEmailAddress {
  email: string;
  name?: string;
}

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM_EMAIL =
  process.env.SENDER_EMAIL ||
  process.env.EMAIL_FROM ||
  "info@ymabouncycastles.uk";
const DEFAULT_FROM_NAME = process.env.EMAIL_FROM_NAME || "YMA Bouncy Castle";
const DEFAULT_TO_EMAIL =
  process.env.EMAIL_USER || process.env.ADMIN_EMAIL || DEFAULT_FROM_EMAIL;

const parseSingleAddress = (input?: EmailAddress): ParsedEmailAddress => {
  if (!input) {
    return { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME };
  }

  if (typeof input !== "string") {
    return { email: input.email, name: input.name };
  }

  const trimmed = input.trim();
  const bracketMatch = trimmed.match(/^(.*)<(.+@.+\..+)>$/);
  if (bracketMatch) {
    const rawName = bracketMatch[1].trim().replace(/^"(.*)"$/, "$1");
    return {
      email: bracketMatch[2].trim(),
      name: rawName || undefined,
    };
  }

  return { email: trimmed };
};

const normalizeEmails = (value?: string | string[]): string[] => {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((item) =>
    item
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
};

export const sendEmail = async (options: SendMailOptions) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[Email][Resend] Missing RESEND_API_KEY");
    throw new Error("RESEND_API_KEY is not configured");
  }

  const fromAddress = parseSingleAddress(options.from);

  const payload = {
    from: fromAddress.name
      ? `${fromAddress.name} <${fromAddress.email}>`
      : fromAddress.email,
    to: normalizeEmails(options.to || DEFAULT_TO_EMAIL),
    cc: normalizeEmails(options.cc),
    bcc: normalizeEmails(options.bcc),
    reply_to: options.replyTo,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  const logContext = {
    from: payload.from,
    to: payload.to,
    cc: payload.cc,
    bcc: payload.bcc,
    subject: payload.subject,
  };

  console.log("[Email][Resend] Sending email", logContext);

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.json().catch(() => ({} as any));
  if (!response.ok) {
    const message =
      (responseBody as { message?: string }).message ||
      "Failed to send email with Resend";
    console.error("[Email][Resend] Send failed", {
      ...logContext,
      status: response.status,
      message,
      responseBody,
    });
    throw new Error(`Resend email send failed (${response.status}): ${message}`);
  }

  console.log("[Email][Resend] Email sent", {
    ...logContext,
    id: (responseBody as { id?: string }).id,
  });

  return responseBody as { id?: string };
};
