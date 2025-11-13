import dotenv from "dotenv";
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  mongo: {
    uri: process.env.MONGO_URI || "mongodb://localhost:27017/yma-bouncy-castle",
  },
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",

  jwt: {
    secret: !!process.env.JWT_SECRET || "your_jwt_secret_key",
    expiresIn: !!process.env.JWT_EXPIRES_IN || "90d",
    cookieExpiresIn: !!process.env.JWT_COOKIE_EXPIRES_IN
      ? parseInt(process.env.JWT_COOKIE_EXPIRES_IN)
      : 90,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL,
    fromName: process.env.SENDGRID_FROM_NAME,
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
};
