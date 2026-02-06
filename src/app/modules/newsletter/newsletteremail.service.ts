import { sendEmail } from "../../utils/resendEmail.service";
import dotenv from "dotenv";
dotenv.config();

export interface NewsletterEmailData {
  subject: string;
  content: string;
  title?: string;
  previewText?: string;
}


// Welcome email for new subscribers
export const sendWelcomeEmail = async (
  email: string,
  name?: string
): Promise<void> => {
  const logoUrl =
    "https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png";

  const userName = name || "Valued Subscriber";
  const currentYear = new Date().getFullYear();

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to YMA Newsletter!</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #4F46E5 0%, #7E69AB 100%);
            padding: 40px 20px;
            text-align: center;
            color: white;
        }
        .logo {
            max-width: 120px;
            height: auto;
            margin-bottom: 20px;
        }
        .content {
            padding: 40px 30px;
        }
        .welcome-text {
            font-size: 24px;
            color: #4F46E5;
            margin-bottom: 20px;
            font-weight: bold;
        }
        .message {
            font-size: 16px;
            color: #666;
            line-height: 1.8;
            margin-bottom: 30px;
        }
        .highlight-box {
            background: #f0f9ff;
            border-left: 4px solid #4F46E5;
            padding: 20px;
            margin: 25px 0;
            border-radius: 8px;
        }
        .footer {
            text-align: center;
            padding: 25px;
            color: #888;
            font-size: 14px;
            border-top: 1px solid #eee;
        }
        .unsubscribe {
            font-size: 12px;
            color: #999;
            margin-top: 20px;
        }
        .social-icons {
            margin: 20px 0;
        }
        .social-icons a {
            margin: 0 10px;
            color: #4F46E5;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${logoUrl}" alt="YMA Logo" class="logo">
            <h1 style="margin: 0; font-size: 28px;">Welcome to YMA Family!</h1>
        </div>
        
        <div class="content">
            <div class="welcome-text">🎉 Welcome ${userName}!</div>
            
            <div class="message">
                Thank you for subscribing to the YMA newsletter! We're excited to have you as part of our community.
            </div>
            
            <div class="highlight-box">
                <h3 style="color: #4F46E5; margin-top: 0;">✨ What to Expect:</h3>
                <ul style="color: #666;">
                    <li>Latest bouncy castle deals & offers</li>
                    <li>New product announcements</li>
                    <li>Party planning tips & tricks</li>
                    <li>Exclusive subscriber discounts</li>
                    <li>Safety guides & maintenance tips</li>
                </ul>
            </div>
            
            <div class="message">
                Stay tuned for exciting updates delivered straight to your inbox. We promise not to spam you - only valuable content that matters!
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://yma-bouncycastle.com" style="
                    background: #4F46E5;
                    color: white;
                    padding: 14px 30px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                    display: inline-block;
                ">Visit Our Website</a>
            </div>
            
            <div class="social-icons" style="text-align: center;">
                <p style="color: #666; margin-bottom: 15px;">Follow us for more updates:</p>
                <a href="#">📘 Facebook</a>
                <a href="#">📸 Instagram</a>
                <a href="#">💼 LinkedIn</a>
                <a href="#">🐦 Twitter</a>
            </div>
        </div>
        
        <div class="footer">
            <p>YMA Bouncy Castle Rentals<br>
            Making every party memorable since 2010</p>
            
            <div class="unsubscribe">
                <p>You received this email because you subscribed to YMA newsletter.<br>
                If you no longer wish to receive these emails, you can <a href="https://yma-bouncycastle.com/unsubscribe?email=${email}" style="color: #4F46E5;">unsubscribe here</a>.</p>
            </div>
            
            <p style="margin-top: 20px; font-size: 12px; color: #aaa;">
                © ${currentYear} YMA Bouncy Castle. All rights reserved.<br>
                London, United Kingdom
            </p>
        </div>
    </div>
</body>
</html>
  `;

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || "YMA Newsletter"}" <${
      process.env.SENDER_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER
    }>`,
    to: email,
    subject: "🎈 Welcome to YMA Newsletter!",
    html: emailHtml,
    text: `
Welcome to YMA Newsletter!

Thank you for subscribing to the YMA newsletter! We're excited to have you as part of our community.

✨ What to Expect:
• Latest bouncy castle deals & offers
• New product announcements
• Party planning tips & tricks
• Exclusive subscriber discounts
• Safety guides & maintenance tips

Stay tuned for exciting updates delivered straight to your inbox. We promise not to spam you - only valuable content that matters!

Visit our website: https://yma-bouncycastle.com

Follow us on social media for more updates.

---
You received this email because you subscribed to YMA newsletter.
To unsubscribe, visit: https://yma-bouncycastle.com/unsubscribe?email=${email}

© ${currentYear} YMA Bouncy Castle. All rights reserved.
London, United Kingdom
    `.trim(),
  };

  await sendEmail(mailOptions);
};

// Send newsletter email
export const sendNewsletterEmail = async (
  email: string,
  name: string | undefined,
  newsletterData: NewsletterEmailData
): Promise<void> => {
  const logoUrl =
    "https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png";
  const userName = name || "Valued Subscriber";
  const currentYear = new Date().getFullYear();
  const unsubscribeUrl = `https://yma-bouncycastle.com/unsubscribe?email=${email}`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${newsletterData.subject}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #4F46E5 0%, #7E69AB 100%);
            padding: 30px 20px;
            text-align: center;
            color: white;
        }
        .logo {
            max-width: 100px;
            height: auto;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            color: #4F46E5;
            font-size: 18px;
            margin-bottom: 25px;
        }
        .newsletter-title {
            color: #222;
            font-size: 24px;
            margin: 25px 0 15px 0;
            font-weight: bold;
        }
        .newsletter-content {
            color: #555;
            line-height: 1.8;
            font-size: 16px;
            margin-bottom: 30px;
        }
        .cta-button {
            display: block;
            background: #4F46E5;
            color: white;
            text-align: center;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 30px 0;
        }
        .footer {
            text-align: center;
            padding: 25px;
            color: #888;
            font-size: 14px;
            border-top: 1px solid #eee;
            background: #f9f9f9;
        }
        .unsubscribe {
            font-size: 12px;
            color: #999;
            margin-top: 20px;
        }
        .social-icons {
            margin: 20px 0;
        }
        .social-icons a {
            margin: 0 10px;
            color: #4F46E5;
            text-decoration: none;
        }
        .highlight {
            background: #f0f9ff;
            padding: 20px;
            border-radius: 10px;
            margin: 25px 0;
            border-left: 4px solid #4F46E5;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${logoUrl}" alt="YMA Logo" class="logo">
            <h2 style="margin: 15px 0 0 0; font-size: 22px;">${
              newsletterData.title || "YMA Newsletter"
            }</h2>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello ${userName},
            </div>
            
            ${
              newsletterData.previewText
                ? `
            <div class="highlight">
                <strong>${newsletterData.previewText}</strong>
            </div>
            `
                : ""
            }
            
            ${newsletterData.content}
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="https://yma-bouncycastle.com/shop" class="cta-button">
                    🛒 Shop Bouncy Castles
                </a>
                <a href="https://yma-bouncycastle.com/contact" class="cta-button" style="background: #10B981; margin-top: 15px;">
                    📞 Book Now
                </a>
            </div>
        </div>
        
        <div class="footer">
            <div class="social-icons">
                <p style="color: #666; margin-bottom: 15px;">Follow us:</p>
                <a href="#">📘 Facebook</a>
                <a href="#">📸 Instagram</a>
                <a href="#">💼 LinkedIn</a>
                <a href="#">🐦 Twitter</a>
            </div>
            
            <p>YMA Bouncy Castle Rentals<br>
            📍 London, United Kingdom<br>
            📧 contact@yma-bouncycastle.com</p>
            
            <div class="unsubscribe">
                <p>You received this email because you subscribed to YMA newsletter.<br>
                <a href="${unsubscribeUrl}" style="color: #4F46E5;">Click here to unsubscribe</a></p>
            </div>
            
            <p style="margin-top: 20px; font-size: 12px; color: #aaa;">
                © ${currentYear} YMA Bouncy Castle. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
  `;

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || "YMA Newsletter"}" <${
      process.env.SENDER_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER
    }>`,
    to: email,
    subject: newsletterData.subject,
    html: emailHtml,
    text: `
${newsletterData.subject}

Hello ${userName},

${newsletterData.previewText || ""}

${newsletterData.content}

---
Shop Bouncy Castles: https://yma-bouncycastle.com/shop
Book Now: https://yma-bouncycastle.com/contact

Follow us on social media:
• Facebook: [link]
• Instagram: [link]
• LinkedIn: [link]
• Twitter: [link]

---
YMA Bouncy Castle Rentals
📍 London, United Kingdom
📧 contact@yma-bouncycastle.com

You received this email because you subscribed to YMA newsletter.
To unsubscribe, visit: ${unsubscribeUrl}

© ${currentYear} YMA Bouncy Castle. All rights reserved.
    `.trim(),
  };

  await sendEmail(mailOptions);
};
