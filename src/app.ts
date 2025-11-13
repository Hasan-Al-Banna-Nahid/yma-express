import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import authRouter from "./app/routes/auth.route";
import bookingRouter from "./app/routes/booking.route";
import inventoryRouter from "./app/routes/inventory.route";
import invoiceRouter from "./app/routes/invoice.route";
import adminRoutes from "./app/routes/admin.routes";
import { globalErrorHandler } from "./app/utils/apiError";
import mailRoute from "./app/routes/mail.route";
import categoryRoutes from "./app/routes/category.routes";
import productRoutes from "./app/routes/product.route";
import cartRoutes from "./app/routes/cart.routes";
import locationRoutes from "./app/routes/location.routes";
import checkoutRoutes from "./app/routes/checkout.routes";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://yma-bouncy-castle-frontend-rlrg.vercel.app",
  "http://localhost:5000",
  "https://yma-eight.vercel.app",
  "https://yma-frontend.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.text());
app.use(cookieParser());

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src", "app", "views"));

// Auth routes
app.use("/auth", authRouter);
app.use("/api/v1/auth", authRouter);

// API routes - FIXED: Mount cartRoutes with proper path
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/invoices", invoiceRouter);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/mail", mailRoute);
app.use("/api/v1/locations", locationRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/cart", cartRoutes); // FIXED: Changed from "/api/v1/" to "/api/v1/cart"
app.use("/api/v1/checkout", checkoutRoutes);

// Health check
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// 404 handler
app.use((req, res) =>
  res
    .status(404)
    .json({ status: "fail", message: "Not Found", path: req.originalUrl })
);
app.use(globalErrorHandler);

export default app;
