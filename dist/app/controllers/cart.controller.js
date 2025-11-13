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
exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.addToCart = exports.getCart = void 0;
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const cartService = __importStar(require("../services/cart.service"));
exports.getCart = (0, asyncHandler_1.default)(async (req, res, next) => {
    const userId = req.user._id.toString();
    const cart = await cartService.getCartByUserId(userId);
    res.status(200).json({
        status: "success",
        data: {
            cart,
        },
    });
});
exports.addToCart = (0, asyncHandler_1.default)(async (req, res, next) => {
    const userId = req.user._id.toString();
    const { productId, quantity } = req.body;
    const cart = await cartService.addItemToCart(userId, productId, quantity);
    res.status(200).json({
        status: "success",
        data: {
            cart,
        },
    });
});
exports.updateCartItem = (0, asyncHandler_1.default)(async (req, res, next) => {
    const userId = req.user._id.toString();
    const { productId } = req.params;
    const { quantity } = req.body;
    const cart = await cartService.updateCartItem(userId, productId, quantity);
    res.status(200).json({
        status: "success",
        data: {
            cart,
        },
    });
});
exports.removeFromCart = (0, asyncHandler_1.default)(async (req, res, next) => {
    const userId = req.user._id.toString();
    const { productId } = req.params;
    const cart = await cartService.removeItemFromCart(userId, productId);
    res.status(200).json({
        status: "success",
        data: {
            cart,
        },
    });
});
exports.clearCart = (0, asyncHandler_1.default)(async (req, res, next) => {
    const userId = req.user._id.toString();
    const cart = await cartService.clearCart(userId);
    res.status(200).json({
        status: "success",
        data: {
            cart,
        },
    });
});
