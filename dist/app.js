"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const auth_route_1 = __importDefault(require("./app/routes/auth.route"));
const booking_route_1 = __importDefault(require("./app/routes/booking.route"));
const inventory_route_1 = __importDefault(require("./app/routes/inventory.route"));
const invoice_route_1 = __importDefault(require("./app/routes/invoice.route"));
const admin_routes_1 = __importDefault(require("./app/routes/admin.routes"));
const apiError_1 = require("./app/utils/apiError");
const mail_route_1 = __importDefault(require("./app/routes/mail.route"));
const category_routes_1 = __importDefault(require("./app/routes/category.routes"));
const product_route_1 = __importDefault(require("./app/routes/product.route"));
const cart_routes_1 = __importDefault(require("./app/routes/cart.routes"));
const location_routes_1 = __importDefault(require("./app/routes/location.routes"));
const app = (0, express_1.default)();
const allowedOrigins = [
    "http://localhost:3000",
    "https://yma-bouncy-castle-frontend-rlrg.vercel.app",
    "http://localhost:5000",
    "https://yma-eight.vercel.app",
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin))
            return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.text());
app.use((0, cookie_parser_1.default)());
app.set("view engine", "ejs");
app.set("views", path_1.default.join(process.cwd(), "src", "app", "views"));
app.use("/auth", auth_route_1.default);
app.use("/api/v1/auth", auth_route_1.default);
app.use("/api/v1/bookings", booking_route_1.default);
app.use("/api/v1/inventory", inventory_route_1.default);
app.use("/api/v1/invoices", invoice_route_1.default);
app.use("/api/v1/admin", admin_routes_1.default);
app.use("/api/v1/mail", mail_route_1.default);
app.use("/api/v1/locations", location_routes_1.default); // Add this line
app.use("/api/v1/categories", category_routes_1.default);
app.use("/api/v1/products", product_route_1.default);
app.use("/api/v1/cart", cart_routes_1.default);
// Health check
app.get("/healthz", (_req, res) => res.json({ ok: true }));
// 404 handler
app.use((req, res) => res
    .status(404)
    .json({ status: "fail", message: "Not Found", path: req.originalUrl }));
app.use(apiError_1.globalErrorHandler);
exports.default = app;
