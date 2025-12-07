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
exports.getDeliveryReminderOrders = exports.sendDeliveryReminders = exports.getOrdersByUser = exports.searchOrders = exports.getOrderStats = exports.deleteOrder = exports.updateOrderStatus = exports.updateOrder = exports.createOrder = exports.getOrderById = exports.getAllOrders = void 0;
const asyncHandler_1 = __importDefault(require("../../../utils/asyncHandler"));
const orderService = __importStar(require("../../../services/order.service"));
const apiError_1 = __importDefault(require("../../../utils/apiError"));
const email_service_1 = require("../../../services/email.service");
exports.getAllOrders = (0, asyncHandler_1.default)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const search = req.query.search;
    const result = await orderService.getAllOrders(page, limit, status, startDate, endDate, search);
    res.status(200).json({
        status: "success",
        data: {
            orders: result.orders,
            pagination: {
                page,
                limit,
                total: result.total,
                pages: result.pages,
            },
        },
    });
});
exports.getOrderById = (0, asyncHandler_1.default)(async (req, res) => {
    const orderId = req.params.id;
    const order = await orderService.getOrderById(orderId);
    res.status(200).json({
        status: "success",
        data: {
            order,
        },
    });
});
exports.createOrder = (0, asyncHandler_1.default)(async (req, res) => {
    const orderData = req.body;
    // Validate required fields
    if (!orderData.user || !orderData.items || !orderData.shippingAddress) {
        throw new apiError_1.default("Missing required fields", 400);
    }
    const order = await orderService.createOrder(orderData);
    res.status(201).json({
        status: "success",
        data: {
            order,
        },
    });
});
exports.updateOrder = (0, asyncHandler_1.default)(async (req, res) => {
    const orderId = req.params.id;
    const updateData = req.body;
    const order = await orderService.updateOrder(orderId, updateData);
    res.status(200).json({
        status: "success",
        data: {
            order,
        },
    });
});
exports.updateOrderStatus = (0, asyncHandler_1.default)(async (req, res) => {
    const orderId = req.params.id;
    const { status, adminNotes } = req.body;
    if (!status ||
        !["pending", "confirmed", "shipped", "delivered", "cancelled"].includes(status)) {
        throw new apiError_1.default("Invalid status", 400);
    }
    const order = await orderService.updateOrderStatus(orderId, status, adminNotes);
    res.status(200).json({
        status: "success",
        data: {
            order,
        },
    });
});
exports.deleteOrder = (0, asyncHandler_1.default)(async (req, res) => {
    const orderId = req.params.id;
    await orderService.deleteOrder(orderId);
    res.status(204).json({
        status: "success",
        data: null,
    });
});
exports.getOrderStats = (0, asyncHandler_1.default)(async (req, res) => {
    const stats = await orderService.getOrderStats();
    res.status(200).json({
        status: "success",
        data: {
            stats,
        },
    });
});
exports.searchOrders = (0, asyncHandler_1.default)(async (req, res) => {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    if (!query) {
        throw new apiError_1.default("Search query is required", 400);
    }
    const result = await orderService.searchOrders(query, page, limit);
    res.status(200).json({
        status: "success",
        data: {
            orders: result.orders,
            pagination: {
                page,
                limit,
                total: result.total,
                pages: result.pages,
            },
        },
    });
});
exports.getOrdersByUser = (0, asyncHandler_1.default)(async (req, res) => {
    const userId = req.params.userId;
    const orders = await orderService.getOrdersByUserId(userId);
    res.status(200).json({
        status: "success",
        results: orders.length,
        data: {
            orders,
        },
    });
});
exports.sendDeliveryReminders = (0, asyncHandler_1.default)(async (req, res) => {
    const orders = await orderService.getOrdersForDeliveryReminders();
    // Send reminder emails
    for (const order of orders) {
        await (0, email_service_1.sendDeliveryReminderEmail)(order);
    }
    res.status(200).json({
        status: "success",
        message: `Delivery reminders sent for ${orders.length} orders`,
        data: {
            ordersCount: orders.length,
        },
    });
});
exports.getDeliveryReminderOrders = (0, asyncHandler_1.default)(async (req, res) => {
    const orders = await orderService.getOrdersForDeliveryReminders();
    res.status(200).json({
        status: "success",
        results: orders.length,
        data: {
            orders,
        },
    });
});
