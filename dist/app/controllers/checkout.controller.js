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
exports.createOrder = void 0;
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const checkoutService = __importStar(require("../services/checkout.service"));
const apiError_1 = __importDefault(require("../utils/apiError"));
exports.createOrder = (0, asyncHandler_1.default)(async (req, res) => {
    const userId = req.user._id.toString();
    console.log("🛒 [CHECKOUT] Creating order for user:", userId);
    const { shippingAddress, paymentMethod = "cash_on_delivery", termsAccepted, invoiceType = "regular", bankDetails, } = req.body;
    // Validate required fields
    if (!shippingAddress) {
        throw new apiError_1.default("Shipping address is required", 400);
    }
    if (termsAccepted === undefined) {
        throw new apiError_1.default("You must accept the terms and conditions", 400);
    }
    if (!termsAccepted) {
        throw new apiError_1.default("You must accept the terms and conditions", 400);
    }
    const order = await checkoutService.createOrderFromCart(userId, {
        shippingAddress,
        paymentMethod,
        termsAccepted,
        invoiceType,
        bankDetails,
    });
    res.status(201).json({
        status: "success",
        message: "Order created successfully",
        data: {
            order,
        },
    });
});
