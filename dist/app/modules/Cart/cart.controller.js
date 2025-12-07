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
exports.clearCart = exports.removeFromCart = exports.updateCartItems = exports.addToCart = exports.getCart = void 0;
const asyncHandler_1 = __importDefault(require("../../utils/asyncHandler"));
const cartService = __importStar(require("./cart.service"));
exports.getCart = (0, asyncHandler_1.default)(async (req, res, next) => {
    const userId = req.user._id.toString();
    console.log("📋 [CONTROLLER] Getting cart for user:", userId);
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
    const { items, productId, quantity, startDate, endDate } = req.body;
    console.log("🛒 [CONTROLLER] Add to cart request:", {
        userId,
        hasItemsArray: Array.isArray(items),
        itemsCount: Array.isArray(items) ? items.length : 0,
        singleItem: productId ? { productId, quantity } : null,
    });
    let cart;
    if (Array.isArray(items)) {
        // Multiple items
        cart = await cartService.addMultipleItemsToCart(userId, items);
    }
    else {
        // Single item (backward compatibility)
        cart = await cartService.addItemToCart(userId, productId, quantity, startDate, endDate);
    }
    res.status(200).json({
        status: "success",
        message: "Items added to cart successfully",
        data: {
            cart,
        },
    });
});
exports.updateCartItems = (0, asyncHandler_1.default)(async (req, res, next) => {
    const userId = req.user._id.toString();
    const { items, productId, quantity, startDate, endDate } = req.body;
    console.log("🔄 [CONTROLLER] Update cart request:", {
        userId,
        hasItemsArray: Array.isArray(items),
        itemsCount: Array.isArray(items) ? items.length : 0,
        singleItem: productId ? { productId, quantity } : null,
    });
    let cart;
    if (Array.isArray(items)) {
        // Multiple items update
        console.log("📦 [CONTROLLER] Processing multiple items update");
        cart = await cartService.updateCartItems(userId, { items });
    }
    else if (productId && quantity !== undefined) {
        // Single item update (backward compatibility)
        console.log("🛒 [CONTROLLER] Processing single item update for product:", productId);
        cart = await cartService.updateCartItems(userId, {
            productId,
            quantity,
            startDate,
            endDate,
        });
    }
    else {
        // Invalid request
        return res.status(400).json({
            status: "error",
            message: "Either provide 'items' array or 'productId' with 'quantity'",
        });
    }
    console.log("✅ [CONTROLLER] Cart update completed successfully");
    res.status(200).json({
        status: "success",
        message: "Cart updated successfully",
        data: {
            cart,
        },
    });
});
exports.removeFromCart = (0, asyncHandler_1.default)(async (req, res, next) => {
    const userId = req.user._id.toString();
    const { productId } = req.params;
    console.log("🗑️ [CONTROLLER] Removing item:", { userId, productId });
    const cart = await cartService.removeItemFromCart(userId, productId);
    res.status(200).json({
        status: "success",
        message: "Item removed from cart successfully",
        data: {
            cart,
        },
    });
});
exports.clearCart = (0, asyncHandler_1.default)(async (req, res, next) => {
    const userId = req.user._id.toString();
    console.log("🧹 [CONTROLLER] Clearing cart for user:", userId);
    const cart = await cartService.clearCart(userId);
    res.status(200).json({
        status: "success",
        message: "Cart cleared successfully",
        data: {
            cart,
        },
    });
});
