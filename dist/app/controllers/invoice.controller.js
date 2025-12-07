"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCustomInvoiceHandler = exports.generateInvoiceForBookingHandler = exports.deleteInvoiceHandler = exports.updateInvoiceHandler = exports.getInvoicesByBookingHandler = exports.getInvoicesHandler = exports.getInvoiceHandler = exports.createInvoiceHandler = exports.downloadOrderInvoiceController = exports.generateOrderInvoiceController = void 0;
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const invoice_service_1 = require("../services/invoice.service");
const orderService = __importStar(require("../services/order.service"));
// Simple invoice controller that only handles order invoices
exports.generateOrderInvoiceController = (0, asyncHandler_1.default)(async (req, res, next) => {
    const orderId = req.params.id;
    console.log("🧾 [CONTROLLER] Generating invoice for order:", orderId);
    try {
        const order = await orderService.getOrderById(orderId);
        const invoiceHtml = await (0, invoice_service_1.generateInvoiceHtml)(order);
        // Set headers for HTML response
        res.setHeader("Content-Type", "text/html");
        res.setHeader("Content-Disposition", `inline; filename="invoice-${orderId}.html"`);
        res.send(invoiceHtml);
    }
    catch (error) {
        console.error("❌ [CONTROLLER] Invoice generation failed:", error);
        throw new apiError_1.default("Failed to generate invoice", 500);
    }
});
exports.downloadOrderInvoiceController = (0, asyncHandler_1.default)(async (req, res, next) => {
    const orderId = req.params.id;
    console.log("📥 [CONTROLLER] Downloading invoice for order:", orderId);
    try {
        const order = await orderService.getOrderById(orderId);
        const invoiceHtml = await (0, invoice_service_1.generateInvoiceHtml)(order);
        // Set headers for download
        res.setHeader("Content-Type", "text/html");
        res.setHeader("Content-Disposition", `attachment; filename="invoice-${orderId}.html"`);
        res.send(invoiceHtml);
    }
    catch (error) {
        console.error("❌ [CONTROLLER] Invoice download failed:", error);
        throw new apiError_1.default("Failed to download invoice", 500);
    }
});
// Stub functions for missing invoice handlers
exports.createInvoiceHandler = (0, asyncHandler_1.default)(async (req, res) => {
    res.status(501).json({
        status: "error",
        message: "Not Implemented: createInvoiceHandler",
    });
});
exports.getInvoiceHandler = (0, asyncHandler_1.default)(async (req, res) => {
    res.status(501).json({
        status: "error",
        message: "Not Implemented: getInvoiceHandler",
    });
});
exports.getInvoicesHandler = (0, asyncHandler_1.default)(async (req, res) => {
    res.status(501).json({
        status: "error",
        message: "Not Implemented: getInvoicesHandler",
    });
});
exports.getInvoicesByBookingHandler = (0, asyncHandler_1.default)(async (req, res) => {
    res.status(501).json({
        status: "error",
        message: "Not Implemented: getInvoicesByBookingHandler",
    });
});
exports.updateInvoiceHandler = (0, asyncHandler_1.default)(async (req, res) => {
    res.status(501).json({
        status: "error",
        message: "Not Implemented: updateInvoiceHandler",
    });
});
exports.deleteInvoiceHandler = (0, asyncHandler_1.default)(async (req, res) => {
    res.status(501).json({
        status: "error",
        message: "Not Implemented: deleteInvoiceHandler",
    });
});
exports.generateInvoiceForBookingHandler = (0, asyncHandler_1.default)(async (req, res) => {
    res.status(501).json({
        status: "error",
        message: "Not Implemented: generateInvoiceForBookingHandler",
    });
});
exports.generateCustomInvoiceHandler = (0, asyncHandler_1.default)(async (req, res) => {
    res.status(501).json({
        status: "error",
        message: "Not Implemented: generateCustomInvoiceHandler",
    });
});
