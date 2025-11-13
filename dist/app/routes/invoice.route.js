"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const invoice_controller_1 = require("../controllers/invoice.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = express_1.default.Router();
// Protect all routes after this middleware
router.use(auth_middleware_1.protectRoute);
router.post("/", invoice_controller_1.createInvoiceHandler);
router.get("/", invoice_controller_1.getInvoicesHandler);
router.get("/booking/:bookingId", invoice_controller_1.getInvoicesByBookingHandler);
router.post("/generate/:bookingId", invoice_controller_1.generateInvoiceForBookingHandler);
router.post("/generate-custom", invoice_controller_1.generateCustomInvoiceHandler);
router.get("/:id", invoice_controller_1.getInvoiceHandler);
router.patch("/:id", invoice_controller_1.updateInvoiceHandler);
router.delete("/:id", invoice_controller_1.deleteInvoiceHandler);
// Admin only routes
router.use((0, auth_middleware_1.restrictTo)('admin'));
// Add admin-only invoice routes here if needed
exports.default = router;
