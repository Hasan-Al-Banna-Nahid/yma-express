import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export interface ContactEmailData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  message: string;
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false, // Changed from true to false for port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Test transporter connection
transporter.verify((error) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
  } else {
    console.log("✅ Email transporter is ready");
  }
});

export const sendContactEmail = async (
  contactData: ContactEmailData
): Promise<void> => {
  try {
    const logoUrl =
      "https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png";
    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Contact Message - YMA</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 3px solid #4F46E5;
            margin-bottom: 30px;
        }
        .logo {
            max-width: 150px;
            height: auto;
        }
        .content {
            background-color: #f9fafb;
            padding: 25px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 20px 0;
        }
        .info-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #4F46E5;
        }
        .label {
            font-weight: bold;
            color: #4F46E5;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .value {
            font-size: 14px;
            color: #374151;
        }
        .message-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            margin-top: 20px;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            margin-top: 30px;
        }
        .date {
            background-color: #4F46E5;
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            display: inline-block;
            font-size: 12px;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <div class="header">
        <img src="${logoUrl}" alt="YMA Logo" class="logo">
        <h1 style="color: #4F46E5; margin-top: 10px;">New Contact Message</h1>
        <div class="date">${currentDate}</div>
    </div>
    
    <div class="content">
        <h2 style="color: #374151; margin-bottom: 25px;">👋 Hello YMA Team,</h2>
        <p style="color: #6b7280; margin-bottom: 20px;">
            You have received a new contact message from a website visitor. Here are the details:
        </p>
        
        <div class="info-grid">
            <div class="info-item">
                <div class="label">Full Name</div>
                <div class="value">${contactData.firstName} ${
      contactData.lastName
    }</div>
            </div>
            <div class="info-item">
                <div class="label">Email Address</div>
                <div class="value">${contactData.email}</div>
            </div>
            ${
              contactData.phoneNumber
                ? `
            <div class="info-item">
                <div class="label">Phone Number</div>
                <div class="value">${contactData.phoneNumber}</div>
            </div>
            `
                : ""
            }
            <div class="info-item">
                <div class="label">Date Submitted</div>
                <div class="value">${new Date().toLocaleString()}</div>
            </div>
        </div>
        
        <div class="message-box">
            <div class="label" style="margin-bottom: 10px;">Message</div>
            <div style="color: #374151; white-space: pre-wrap; line-height: 1.8;">${
              contactData.message
            }</div>
        </div>
        
        <div style="margin-top: 30px; padding: 15px; background-color: #e0e7ff; border-radius: 8px;">
            <p style="margin: 0; color: #374151; font-size: 14px;">
                <strong>📞 Action Required:</strong> Please respond to ${
                  contactData.firstName
                } within 24 hours.
            </p>
        </div>
    </div>
    
    <div class="footer">
        <p>This email was automatically generated by YMA Contact System.</p>
        <p>© ${new Date().getFullYear()} YMA. All rights reserved.</p>
    </div>
</body>
</html>
  `;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || "YMA Contact System"}" <${
        process.env.EMAIL_FROM || process.env.EMAIL_USER
      }>`,
      to: process.env.EMAIL_USER, // Send to your own email
      replyTo: contactData.email, // So you can reply directly to the customer
      subject: `📧 New Contact Message from ${contactData.firstName} ${contactData.lastName}`,
      html: emailHtml,
      text: `
New Contact Message from YMA Website
====================================

Name: ${contactData.firstName} ${contactData.lastName}
Email: ${contactData.email}
${contactData.phoneNumber ? `Phone: ${contactData.phoneNumber}` : ""}
Date: ${new Date().toLocaleString()}

Message:
${contactData.message}

---
Please respond to this inquiry promptly.
      `.trim(),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent: ${info.messageId}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error(
      `Failed to send email: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};
