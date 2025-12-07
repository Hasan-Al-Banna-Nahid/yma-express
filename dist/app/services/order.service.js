"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrdersByUserId = exports.searchOrders = exports.getOrdersForDeliveryReminders = exports.getOrderStats = exports.deleteOrder = exports.updateOrderStatus = exports.updateOrder = exports.getAllOrders = exports.getOrderById = exports.createOrder = void 0;
// src/services/order.service.ts
const order_model_1 = __importDefault(require("../models/order.model"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const mongoose_1 = __importDefault(require("mongoose"));
const invoice_service_1 = require("./invoice.service");
const email_service_1 = require("./email.service");
const createOrder = async (orderData) => {
    try {
        // Generate order number
        const prefix = "YMA";
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, "0");
        const orderNumber = `${prefix}-${timestamp}-${random}`;
        const order = await order_model_1.default.create({
            ...orderData,
            orderNumber,
            status: "pending",
        });
        const populatedOrder = await order_model_1.default.findById(order._id)
            .populate("user", "name email phone")
            .populate("items.product", "name imageCover price");
        if (!populatedOrder) {
            throw new apiError_1.default("Failed to retrieve populated order", 500);
        }
        return populatedOrder;
    }
    catch (error) {
        throw new apiError_1.default("Failed to create order", 500);
    }
};
exports.createOrder = createOrder;
const getOrderById = async (orderId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(orderId)) {
        throw new apiError_1.default("Invalid order ID", 400);
    }
    const order = await order_model_1.default.findById(orderId)
        .populate("user", "name email phone")
        .populate("items.product", "name imageCover price");
    if (!order) {
        throw new apiError_1.default("Order not found", 404);
    }
    return order;
};
exports.getOrderById = getOrderById;
const getAllOrders = async (page = 1, limit = 10, status, startDate, endDate, search) => {
    const skip = (page - 1) * limit;
    const filter = {};
    if (status)
        filter.status = status;
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate)
            filter.createdAt.$gte = new Date(startDate);
        if (endDate)
            filter.createdAt.$lte = new Date(endDate);
    }
    if (search) {
        filter.$or = [
            { orderNumber: { $regex: search, $options: "i" } },
            { "shippingAddress.firstName": { $regex: search, $options: "i" } },
            { "shippingAddress.lastName": { $regex: search, $options: "i" } },
            { "shippingAddress.email": { $regex: search, $options: "i" } },
            { "shippingAddress.phone": { $regex: search, $options: "i" } },
        ];
    }
    const orders = await order_model_1.default.find(filter)
        .populate("user", "name email phone")
        .populate("items.product", "name imageCover price")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    const total = await order_model_1.default.countDocuments(filter);
    return {
        orders,
        total,
        pages: Math.ceil(total / limit),
    };
};
exports.getAllOrders = getAllOrders;
const updateOrder = async (orderId, updateData) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(orderId)) {
        throw new apiError_1.default("Invalid order ID", 400);
    }
    const order = await order_model_1.default.findById(orderId);
    if (!order) {
        throw new apiError_1.default("Order not found", 404);
    }
    // Don't allow updating order number
    if (updateData.orderNumber) {
        delete updateData.orderNumber;
    }
    Object.assign(order, updateData);
    await order.save();
    const populatedOrder = await order_model_1.default.findById(order._id)
        .populate("user", "name email phone")
        .populate("items.product", "name imageCover price");
    if (!populatedOrder) {
        throw new apiError_1.default("Failed to retrieve populated order after update", 500);
    }
    return populatedOrder;
};
exports.updateOrder = updateOrder;
const updateOrderStatus = async (orderId, status, adminNotes) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(orderId)) {
        throw new apiError_1.default("Invalid order ID", 400);
    }
    const order = await order_model_1.default.findById(orderId)
        .populate("user", "name email")
        .populate("items.product", "name imageCover price");
    if (!order) {
        throw new apiError_1.default("Order not found", 404);
    }
    const previousStatus = order.status;
    order.status = status;
    if (status === "delivered") {
        order.deliveryDate = new Date();
    }
    if (adminNotes) {
        order.adminNotes = adminNotes;
    }
    await order.save();
    // Send emails based on status change
    if (status === "confirmed" && previousStatus !== "confirmed") {
        // Send order confirmation email with invoice attached
        await (0, email_service_1.sendOrderConfirmationEmail)(order);
        // Generate and send invoice
        const invoiceHtml = await (0, invoice_service_1.generateInvoiceHtml)(order);
        await (0, email_service_1.sendInvoiceEmail)(order, invoiceHtml);
    }
    return order;
};
exports.updateOrderStatus = updateOrderStatus;
const deleteOrder = async (orderId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(orderId)) {
        throw new apiError_1.default("Invalid order ID", 400);
    }
    const order = await order_model_1.default.findById(orderId);
    if (!order) {
        throw new apiError_1.default("Order not found", 404);
    }
    // Only allow deleting pending or cancelled orders
    if (!["pending", "cancelled"].includes(order.status)) {
        throw new apiError_1.default("Cannot delete orders that are confirmed, shipped, or delivered", 400);
    }
    await order.deleteOne();
};
exports.deleteOrder = deleteOrder;
const getOrderStats = async () => {
    const [totalOrders, pendingOrders, confirmedOrders, shippedOrders, deliveredOrders, cancelledOrders,] = await Promise.all([
        order_model_1.default.countDocuments(),
        order_model_1.default.countDocuments({ status: "pending" }),
        order_model_1.default.countDocuments({ status: "confirmed" }),
        order_model_1.default.countDocuments({ status: "shipped" }),
        order_model_1.default.countDocuments({ status: "delivered" }),
        order_model_1.default.countDocuments({ status: "cancelled" }),
    ]);
    const revenueResult = await order_model_1.default.aggregate([
        { $match: { status: { $in: ["confirmed", "shipped", "delivered"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const monthlyRevenueResult = await order_model_1.default.aggregate([
        {
            $match: {
                status: { $in: ["confirmed", "shipped", "delivered"] },
                createdAt: {
                    $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                },
            },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    return {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue: revenueResult[0]?.total || 0,
        monthlyRevenue: monthlyRevenueResult[0]?.total || 0,
    };
};
exports.getOrderStats = getOrderStats;
const getOrdersForDeliveryReminders = async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    return await order_model_1.default.find({
        status: { $in: ["confirmed", "shipped"] },
        estimatedDeliveryDate: {
            $gte: tomorrow,
            $lt: dayAfterTomorrow,
        },
    })
        .populate("user", "name email")
        .populate("items.product", "name imageCover price");
};
exports.getOrdersForDeliveryReminders = getOrdersForDeliveryReminders;
const searchOrders = async (query, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const searchFilter = {
        $or: [
            { orderNumber: { $regex: query, $options: "i" } },
            { "shippingAddress.firstName": { $regex: query, $options: "i" } },
            { "shippingAddress.lastName": { $regex: query, $options: "i" } },
            { "shippingAddress.email": { $regex: query, $options: "i" } },
            { "shippingAddress.phone": { $regex: query, $options: "i" } },
        ],
    };
    const orders = await order_model_1.default.find(searchFilter)
        .populate("user", "name email phone")
        .populate("items.product", "name imageCover price")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    const total = await order_model_1.default.countDocuments(searchFilter);
    return {
        orders,
        total,
        pages: Math.ceil(total / limit),
    };
};
exports.searchOrders = searchOrders;
const getOrdersByUserId = async (userId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        throw new apiError_1.default("Invalid user ID", 400);
    }
    return await order_model_1.default.find({ user: new mongoose_1.default.Types.ObjectId(userId) })
        .populate("items.product", "name imageCover price")
        .sort({ createdAt: -1 });
};
exports.getOrdersByUserId = getOrdersByUserId;
