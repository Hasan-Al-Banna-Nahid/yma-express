"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.removeItemFromCart = exports.updateCartItem = exports.addItemToCart = exports.getCartByUserId = void 0;
// src/services/cart.service.ts
const cart_model_1 = __importDefault(require("../models/cart.model"));
const product_model_1 = __importDefault(require("../models/product.model"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const mongoose_1 = require("mongoose");
const getCartByUserId = async (userId) => {
    let cart = await cart_model_1.default.findOne({ user: new mongoose_1.Types.ObjectId(userId) }).populate("items.product");
    if (!cart) {
        cart = await cart_model_1.default.create({
            user: new mongoose_1.Types.ObjectId(userId),
            items: [],
        });
    }
    return cart;
};
exports.getCartByUserId = getCartByUserId;
const addItemToCart = async (userId, productId, quantity = 1) => {
    const product = await product_model_1.default.findById(productId);
    if (!product) {
        throw new apiError_1.default("Product not found", 404);
    }
    let cart = await cart_model_1.default.findOne({ user: new mongoose_1.Types.ObjectId(userId) });
    if (!cart) {
        cart = await cart_model_1.default.create({
            user: new mongoose_1.Types.ObjectId(userId),
            items: [
                {
                    product: new mongoose_1.Types.ObjectId(productId),
                    quantity,
                    price: product.price,
                },
            ],
        });
    }
    else {
        const existingItemIndex = cart.items.findIndex((item) => item.product.toString() === productId);
        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += quantity;
        }
        else {
            cart.items.push({
                product: new mongoose_1.Types.ObjectId(productId),
                quantity,
                price: product.price,
            });
        }
        await cart.save();
    }
    return await cart.populate("items.product");
};
exports.addItemToCart = addItemToCart;
const updateCartItem = async (userId, productId, quantity) => {
    if (quantity < 1) {
        throw new apiError_1.default("Quantity must be at least 1", 400);
    }
    const cart = await cart_model_1.default.findOne({ user: new mongoose_1.Types.ObjectId(userId) });
    if (!cart) {
        throw new apiError_1.default("Cart not found", 404);
    }
    const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);
    if (itemIndex === -1) {
        throw new apiError_1.default("Item not found in cart", 404);
    }
    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    return await cart.populate("items.product");
};
exports.updateCartItem = updateCartItem;
const removeItemFromCart = async (userId, productId) => {
    const cart = await cart_model_1.default.findOne({ user: new mongoose_1.Types.ObjectId(userId) });
    if (!cart) {
        throw new apiError_1.default("Cart not found", 404);
    }
    cart.items = cart.items.filter((item) => item.product.toString() !== productId);
    await cart.save();
    return await cart.populate("items.product");
};
exports.removeItemFromCart = removeItemFromCart;
const clearCart = async (userId) => {
    const cart = await cart_model_1.default.findOne({ user: new mongoose_1.Types.ObjectId(userId) });
    if (!cart) {
        throw new apiError_1.default("Cart not found", 404);
    }
    cart.items = [];
    await cart.save();
    return cart;
};
exports.clearCart = clearCart;
