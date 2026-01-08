import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error("Email transporter error:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

// Generate a random password
export const generateRandomPassword = (): string => {
  const length = 12;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
};

// Send welcome email with verification link
export const sendWelcomeVerificationEmail = async (
  email: string,
  name: string,
  verificationLink: string,
  temporaryPassword: string
): Promise<void> => {
  const logoUrl =
    "https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const supportEmail =
    process.env.SUPPORT_EMAIL || "support@ymabouncycastle.com";

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to YMA Bouncy Castle</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
          background-color: #f7f9fc;
          color: #333;
          line-height: 1.6;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
        }
        
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 30px;
          text-align: center;
          color: white;
        }
        
        .logo {
          max-width: 180px;
          height: auto;
          margin-bottom: 20px;
        }
        
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 10px;
          letter-spacing: -0.5px;
        }
        
        .header p {
          font-size: 16px;
          opacity: 0.9;
          max-width: 500px;
          margin: 0 auto;
        }
        
        .content {
          padding: 40px 30px;
        }
        
        .welcome-section {
          text-align: center;
          margin-bottom: 40px;
        }
        
        .welcome-section h2 {
          color: #2d3748;
          font-size: 24px;
          margin-bottom: 15px;
          font-weight: 600;
        }
        
        .welcome-section p {
          color: #4a5568;
          font-size: 16px;
          margin-bottom: 10px;
        }
        
        .info-card {
          background: #f8fafc;
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          border-left: 4px solid #4299e1;
        }
        
        .info-card h3 {
          color: #2d3748;
          margin-bottom: 15px;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .info-card h3 i {
          color: #4299e1;
        }
        
        .password-box {
          background: #ebf8ff;
          border: 2px dashed #4299e1;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
          font-family: monospace;
          font-size: 22px;
          font-weight: 600;
          color: #2d3748;
          letter-spacing: 1px;
        }
        
        .password-note {
          background: #fff5f5;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          border-left: 4px solid #fc8181;
        }
        
        .password-note h4 {
          color: #c53030;
          margin-bottom: 8px;
          font-size: 16px;
        }
        
        .cta-button {
          display: block;
          width: 100%;
          background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
          color: white;
          text-decoration: none;
          padding: 18px;
          border-radius: 10px;
          text-align: center;
          font-size: 18px;
          font-weight: 600;
          margin: 30px 0;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(66, 153, 225, 0.3);
        }
        
        .cta-button:hover {
          background: linear-gradient(135deg, #3182ce 0%, #2c5282 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(66, 153, 225, 0.4);
        }
        
        .steps {
          margin: 30px 0;
        }
        
        .step {
          display: flex;
          align-items: flex-start;
          margin-bottom: 20px;
          padding: 15px;
          background: #f7fafc;
          border-radius: 10px;
        }
        
        .step-number {
          background: #4299e1;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          margin-right: 15px;
          flex-shrink: 0;
        }
        
        .step-content h4 {
          color: #2d3748;
          margin-bottom: 8px;
          font-size: 16px;
        }
        
        .step-content p {
          color: #718096;
          font-size: 14px;
        }
        
        .footer {
          background: #2d3748;
          color: #cbd5e0;
          padding: 30px;
          text-align: center;
          border-radius: 0 0 16px 16px;
        }
        
        .footer-links {
          margin: 20px 0;
        }
        
        .footer-links a {
          color: #90cdf4;
          text-decoration: none;
          margin: 0 10px;
          font-size: 14px;
        }
        
        .footer-links a:hover {
          text-decoration: underline;
        }
        
        .footer p {
          font-size: 14px;
          margin-top: 20px;
          opacity: 0.8;
        }
        
        .social-icons {
          margin: 20px 0;
        }
        
        .social-icons a {
          display: inline-block;
          margin: 0 10px;
          color: #cbd5e0;
          font-size: 18px;
          transition: color 0.3s ease;
        }
        
        .social-icons a:hover {
          color: #4299e1;
        }
        
        .verification-note {
          background: #f0fff4;
          border: 1px solid #9ae6b4;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
          color: #276749;
        }
        
        .link-expiry {
          background: #fffaf0;
          border: 1px solid #fbd38d;
          border-radius: 8px;
          padding: 12px;
          margin: 15px 0;
          font-size: 13px;
          color: #975a16;
          text-align: center;
        }
        
        @media (max-width: 600px) {
          .content {
            padding: 25px 20px;
          }
          
          .header {
            padding: 30px 20px;
          }
          
          .header h1 {
            font-size: 24px;
          }
          
          .welcome-section h2 {
            font-size: 20px;
          }
          
          .cta-button {
            padding: 16px;
            font-size: 16px;
          }
          
          .password-box {
            font-size: 18px;
            padding: 15px;
          }
        }
      </style>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="header">
          <img src="${logoUrl}" alt="YMA Bouncy Castle" class="logo">
          <h1>Welcome to YMA Bouncy Castle!</h1>
          <p>Your adventure with premium bouncy castles begins here</p>
        </div>
        
        <!-- Content -->
        <div class="content">
          <div class="welcome-section">
            <h2>Hello ${name},</h2>
            <p>Thank you for registering with YMA Bouncy Castle! We're excited to have you onboard.</p>
            <p>To complete your registration and access your account, please verify your email address.</p>
          </div>
          
          <div class="info-card">
            <h3><i class="fas fa-key"></i> Your Temporary Password</h3>
            <p>For security purposes, we've generated a temporary password for you. Please use this to log in for the first time:</p>
            <div class="password-box">${temporaryPassword}</div>
            <p class="verification-note">
              <i class="fas fa-exclamation-circle"></i> 
              <strong>Important:</strong> You'll be required to change this password after your first login.
            </p>
          </div>
          
          <!-- Steps -->
          <div class="steps">
            <div class="step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h4>Verify Your Email</h4>
                <p>Click the button below to verify your email address</p>
              </div>
            </div>
            
            <div class="step">
              <div class="step-number">2</div>
              <div class="step-content">
                <h4>Login with Temporary Password</h4>
                <p>Use the temporary password above to log in</p>
              </div>
            </div>
            
            <div class="step">
              <div class="step-number">3</div>
              <div class="step-content">
                <h4>Set New Password</h4>
                <p>Change to a secure password of your choice</p>
              </div>
            </div>
          </div>
          
          <!-- Verification Button -->
          <a href="${verificationLink}" class="cta-button">
            <i class="fas fa-envelope"></i> Verify Email Address
          </a>
          
          <div class="link-expiry">
            <i class="fas fa-clock"></i> This verification link expires in 24 hours
          </div>
          
          <div class="password-note">
            <h4><i class="fas fa-shield-alt"></i> Security Notice</h4>
            <p>For your security:</p>
            <ul style="margin-left: 20px; margin-top: 10px;">
              <li>Never share your password with anyone</li>
              <li>Change your password immediately after first login</li>
              <li>Use a combination of letters, numbers, and special characters</li>
              <li>Our team will never ask for your password</li>
            </ul>
          </div>
          
          <p style="text-align: center; color: #718096; margin-top: 30px;">
            If you didn't create an account with YMA Bouncy Castle, please ignore this email.
          </p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="social-icons">
            <a href="#"><i class="fab fa-facebook"></i></a>
            <a href="#"><i class="fab fa-twitter"></i></a>
            <a href="#"><i class="fab fa-instagram"></i></a>
            <a href="#"><i class="fab fa-linkedin"></i></a>
          </div>
          
          <div class="footer-links">
            <a href="${frontendUrl}/contact">Contact Us</a>
            <a href="${frontendUrl}/privacy">Privacy Policy</a>
            <a href="${frontendUrl}/terms">Terms of Service</a>
            <a href="${frontendUrl}/help">Help Center</a>
          </div>
          
          <p>
            YMA Bouncy Castle &copy; ${new Date().getFullYear()}<br>
            Premium Party Equipment Rental Services<br>
            <small>Email: ${supportEmail}</small>
          </p>
          
          <p style="font-size: 12px; opacity: 0.6; margin-top: 20px;">
            This email was sent to ${email}. Please do not reply to this automated message.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"YMA Bouncy Castle" <${
      process.env.EMAIL_FROM || process.env.EMAIL_USER
    }>`,
    to: email,
    subject: "Welcome to YMA Bouncy Castle - Verify Your Email",
    html: html,
    text: `
Welcome to YMA Bouncy Castle!

Hello ${name},

Thank you for registering with YMA Bouncy Castle!

To complete your registration, please verify your email by visiting:
${verificationLink}

Your temporary password: ${temporaryPassword}

IMPORTANT: Use this temporary password to log in for the first time. You'll be prompted to change it immediately.

Verification Link: ${verificationLink}
Link expires in 24 hours.

If you didn't create this account, please ignore this email.

Best regards,
YMA Bouncy Castle Team
${supportEmail}
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome verification email sent to: ${email}`);
  } catch (error: any) {
    console.error(`Failed to send welcome email to ${email}:`, error);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

// Send verification success email
export const sendVerificationSuccessEmail = async (
  email: string,
  name: string
): Promise<void> => {
  const logoUrl =
    "https://res.cloudinary.com/dj785gqtu/image/upload/v1767711924/logo2_xos8xa.png";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const loginUrl = `${frontendUrl}/login`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verified Successfully</title>
      <style>
        /* Styles similar to welcome email but with success theme */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
          background-color: #f7f9fc;
          color: #333;
          line-height: 1.6;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
        }
        
        .header {
          background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
          padding: 40px 30px;
          text-align: center;
          color: white;
        }
        
        .logo {
          max-width: 180px;
          height: auto;
          margin-bottom: 20px;
        }
        
        .success-icon {
          font-size: 60px;
          margin-bottom: 20px;
          color: #38a169;
        }
        
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 10px;
          letter-spacing: -0.5px;
        }
        
        .content {
          padding: 40px 30px;
          text-align: center;
        }
        
        .success-message {
          background: #f0fff4;
          border-radius: 12px;
          padding: 30px;
          margin: 20px 0;
          border: 2px solid #9ae6b4;
        }
        
        .success-message h2 {
          color: #276749;
          margin-bottom: 15px;
          font-size: 24px;
        }
        
        .success-message p {
          color: #2f855a;
          font-size: 16px;
          margin-bottom: 15px;
        }
        
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
          color: white;
          text-decoration: none;
          padding: 15px 30px;
          border-radius: 10px;
          text-align: center;
          font-size: 18px;
          font-weight: 600;
          margin: 20px 0;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(56, 161, 105, 0.3);
        }
        
        .cta-button:hover {
          background: linear-gradient(135deg, #2f855a 0%, #276749 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(56, 161, 105, 0.4);
        }
        
        .next-steps {
          text-align: left;
          margin: 30px 0;
          background: #f8fafc;
          padding: 25px;
          border-radius: 12px;
        }
        
        .next-steps h3 {
          color: #2d3748;
          margin-bottom: 20px;
          font-size: 18px;
        }
        
        .steps-list {
          list-style: none;
        }
        
        .steps-list li {
          margin-bottom: 15px;
          padding-left: 30px;
          position: relative;
        }
        
        .steps-list li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #38a169;
          font-weight: bold;
          font-size: 18px;
        }
        
        .footer {
          background: #2d3748;
          color: #cbd5e0;
          padding: 30px;
          text-align: center;
          border-radius: 0 0 16px 16px;
        }
        
        @media (max-width: 600px) {
          .content {
            padding: 25px 20px;
          }
          
          .header {
            padding: 30px 20px;
          }
          
          .header h1 {
            font-size: 24px;
          }
          
          .success-message {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <img src="${logoUrl}" alt="YMA Bouncy Castle" class="logo">
          <div class="success-icon">✅</div>
          <h1>Email Verified Successfully!</h1>
        </div>
        
        <div class="content">
          <div class="success-message">
            <h2>Congratulations ${name}!</h2>
            <p>Your email address has been successfully verified.</p>
            <p>Your YMA Bouncy Castle account is now active and ready to use.</p>
          </div>
          
          <div class="next-steps">
            <h3>What's Next?</h3>
            <ul class="steps-list">
              <li>Log in to your account using your temporary password</li>
              <li>Set a new secure password of your choice</li>
              <li>Browse our collection of premium bouncy castles</li>
              <li>Make your first booking and start the fun!</li>
            </ul>
          </div>
          
          <a href="${loginUrl}" class="cta-button">
            Login to Your Account
          </a>
          
          <p style="color: #718096; margin-top: 20px;">
            If you have any questions, contact our support team at ${
              process.env.SUPPORT_EMAIL || "support@ymabouncycastle.com"
            }
          </p>
        </div>
        
        <div class="footer">
          <p>YMA Bouncy Castle &copy; ${new Date().getFullYear()}</p>
          <p style="font-size: 12px; opacity: 0.6; margin-top: 20px;">
            This email confirms your email verification for ${email}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"YMA Bouncy Castle" <${
      process.env.EMAIL_FROM || process.env.EMAIL_USER
    }>`,
    to: email,
    subject: "Email Verified Successfully - YMA Bouncy Castle",
    html: html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification success email sent to: ${email}`);
  } catch (error: any) {
    console.error(`Failed to send verification success email:`, error);
  }
};
