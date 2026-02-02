// src/app.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import dotenv from "dotenv";
// import compression from "compression";
import cluster from "cluster";
import os from "os";
dotenv.config();
// Import routes
import authRouter from "./app/modules/Auth/auth.route";
import bookingRouter from "./app/modules/Bookings/booking.route";
import inventoryRouter from "./app/modules/Inventory/inventory.route";
import invoiceRouter from "./app/modules/Invoice/invoice.route";
import adminRoutes from "./app/modules/Admin/admin.routes";
import { globalErrorHandler } from "./app/utils/apiError";
import categoryRoutes from "./app/modules/Category/category.routes";
import productRoutes from "./app/modules/Product/product.route";
import cartRoutes from "./app/modules/Cart/cart.routes";
import checkoutRoutes from "./app/modules/Checkout/checkout.routes";
import userOrderRoutes from "./app/modules/Order/order.routes";
import locationRoutes from "./app/modules/Location/location.routes";
import contactRoutes from "./app/modules/contact/contact.routes";
import newsletterRoutes from "./app/modules/newsletter/newsletter.routes"; // Add this line
import blogRoutes from "./app/modules/Blog/blog.routes"; // Add this line
import promoRoutes from "./app/modules/promos/promos.routes";
import customerRoutes from "./app/modules/customer/customer.routes";
import seoSettingsRoutes from "./app/modules/SeoSettings/seo.routes";
import { requestPerformance } from "./app/middlewares/performance.middleware";
import { globalCache } from "./app/middlewares/globalCache";
import mongoose from "mongoose";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://yma-bouncy-castle-frontend-rlrg.vercel.app",
  "http://localhost:7000",
  "https://yma-eight.vercel.app",
  "https://yma-frontend.vercel.app",
  process.env.FRONTEND_URL, // From environment
  "http://localhost:8001",
  "https://ymaback.vercel.app",
  process.env.API_PUBLIC_URL, // From environment
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error("Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.text());
app.use(cookieParser());

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src", "app", "views"));
app.use(requestPerformance);
app.use(globalCache);
if (cluster.isPrimary) {
  os.cpus().forEach(() => cluster.fork());
}

app.use("/api/v1/auth", authRouter);

// API routes
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/invoices", invoiceRouter);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/locations", locationRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/checkout", checkoutRoutes);
app.use("/api/v1/orders", userOrderRoutes);
app.use("/api/v1", contactRoutes);
app.use("/api/v1", newsletterRoutes);
app.use("/api/v1/blogs", blogRoutes);
app.use("/api/v1", promoRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/seo-settings", seoSettingsRoutes);

// app.use(compression());

// Health check
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// 404 handler
app.use((req, res) =>
  res
    .status(404)
    .json({ status: "fail", message: "Not Found", path: req.originalUrl }),
);
app.use(globalErrorHandler);

export default app;
