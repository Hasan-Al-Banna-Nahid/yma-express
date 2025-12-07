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
exports.createOrderFromCart = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const cart_model_1 = __importDefault(require("../modules/Cart/cart.model"));
const order_model_1 = __importDefault(require("../models/order.model")); // Import IOrder
const product_model_1 = __importDefault(require("../models/product.model"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const email_service_1 = require("./email.service");
const createOrderFromCart = async (userId, orderData) => {
    // Change return type to IOrder instead of typeof Order
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        console.log("🛒 [CHECKOUT SERVICE] Creating order for user:", userId);
        // Get user's cart with populated items
        const cart = await cart_model_1.default.findOne({ user: new mongoose_1.Types.ObjectId(userId) })
            .populate("items.product")
            .session(session);
        if (!cart || cart.items.length === 0) {
            throw new apiError_1.default("Cart is empty", 400);
        }
        // Validate shipping address
        const requiredAddressFields = [
            "firstName",
            "lastName",
            "email",
            "phone",
            "country",
            "state",
            "city",
            "street",
            "zipCode",
        ];
        const missingFields = requiredAddressFields.filter((field) => {
            const value = orderData.shippingAddress[field];
            return value === undefined || value === null || value === "";
        });
        if (missingFields.length > 0) {
            throw new apiError_1.default(`Missing shipping address fields: ${missingFields.join(", ")}`, 400);
        }
        // Validate billing address if different billing address is selected
        if (orderData.shippingAddress.differentBillingAddress) {
            const requiredBillingFields = [
                "billingFirstName",
                "billingLastName",
                "billingStreet",
                "billingCity",
                "billingState",
                "billingZipCode",
            ];
            const missingBillingFields = requiredBillingFields.filter((field) => {
                const value = orderData.shippingAddress[field];
                return value === undefined || value === null || value === "";
            });
            if (missingBillingFields.length > 0) {
                throw new apiError_1.default(`Missing billing address fields: ${missingBillingFields.join(", ")}`, 400);
            }
        }
        // Validate corporate invoice requirements
        if (orderData.invoiceType === "corporate") {
            if (!orderData.bankDetails || !orderData.bankDetails.bankInfo) {
                throw new apiError_1.default("Bank details are required for corporate invoices", 400);
            }
            if (orderData.bankDetails.bankInfo.trim() === "") {
                throw new apiError_1.default("Bank information cannot be empty", 400);
            }
        }
        // Validate stock and calculate total
        let totalAmount = 0;
        const orderItems = [];
        for (const cartItem of cart.items) {
            const productId = cartItem.product._id || cartItem.product;
            const product = await product_model_1.default.findById(productId).session(session);
            if (!product) {
                throw new apiError_1.default(`Product not found`, 404);
            }
            if (product.stock < cartItem.quantity) {
                throw new apiError_1.default(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}`, 400);
            }
            // Update product stock
            product.stock -= cartItem.quantity;
            await product.save({ session });
            // Create order item
            const orderItem = {
                product: product._id,
                quantity: cartItem.quantity,
                price: cartItem.price,
                name: product.name,
                startDate: cartItem.startDate,
                endDate: cartItem.endDate,
            };
            orderItems.push(orderItem);
            totalAmount += cartItem.quantity * cartItem.price;
        }
        // Calculate estimated delivery date (2 days from now)
        const estimatedDeliveryDate = new Date();
        estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 2);
        // Create order
        const order = new order_model_1.default({
            user: new mongoose_1.Types.ObjectId(userId),
            items: orderItems,
            totalAmount,
            paymentMethod: orderData.paymentMethod,
            shippingAddress: orderData.shippingAddress,
            termsAccepted: orderData.termsAccepted,
            estimatedDeliveryDate,
            invoiceType: orderData.invoiceType || "regular",
            bankDetails: orderData.bankDetails,
        });
        await order.save({ session });
        // Clear cart
        cart.items = [];
        cart.totalPrice = 0;
        cart.totalItems = 0;
        await cart.save({ session });
        await session.commitTransaction();
        session.endSession();
        // Send order confirmation email
        const populatedOrder = await order.populate([
            { path: "user", select: "name email" },
            { path: "items.product", select: "name imageCover price" },
        ]);
        await (0, email_service_1.sendOrderConfirmationEmail)(populatedOrder);
        console.log("✅ [CHECKOUT SERVICE] Order created:", order.orderNumber);
        return populatedOrder;
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("❌ [CHECKOUT SERVICE] Order creation failed:", error);
        throw error;
    }
};
exports.createOrderFromCart = createOrderFromCart;
