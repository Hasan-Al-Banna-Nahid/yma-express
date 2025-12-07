"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addItemToCart = exports.addMultipleItemsToCart = exports.clearCart = exports.removeItemFromCart = exports.getCartByUserId = exports.updateCartItems = void 0;
const cart_model_1 = __importDefault(require("./cart.model"));
const product_model_1 = __importDefault(require("../../models/product.model"));
const apiError_1 = __importDefault(require("../../utils/apiError"));
const mongoose_1 = require("mongoose");
// Unified update function that handles both single and multiple items
const updateCartItems = async (userId, updateData) => {
    const { items, productId, quantity, startDate, endDate } = updateData;
    console.log("🔄 [SERVICE] Processing cart update:", {
        hasItemsArray: Array.isArray(items),
        itemsCount: Array.isArray(items) ? items.length : 0,
        hasSingleItem: !!productId,
    });
    if (Array.isArray(items)) {
        // Multiple items update
        return await updateMultipleCartItems(userId, items);
    }
    else if (productId && quantity !== undefined) {
        // Single item update
        return await updateSingleCartItem(userId, productId, quantity, startDate, endDate);
    }
    else {
        throw new apiError_1.default("Either provide 'items' array or 'productId' with 'quantity' for update", 400);
    }
};
exports.updateCartItems = updateCartItems;
// Single item update (internal function)
const updateSingleCartItem = async (userId, productId, quantity, startDate, endDate) => {
    console.log("🛒 [SERVICE] Updating single item:", { productId, quantity });
    if (quantity < 1) {
        throw new apiError_1.default("Quantity must be at least 1", 400);
    }
    // Validate date ranges
    if (startDate || endDate) {
        if (!startDate || !endDate) {
            throw new apiError_1.default("Both startDate and endDate are required for booking items", 400);
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start >= end) {
            throw new apiError_1.default("End date must be after start date", 400);
        }
        if (start < new Date()) {
            throw new apiError_1.default("Start date cannot be in the past", 400);
        }
    }
    const product = await product_model_1.default.findById(productId);
    if (!product) {
        throw new apiError_1.default("Product not found", 404);
    }
    // Check stock availability
    if (product.stock < quantity) {
        throw new apiError_1.default(`Only ${product.stock} items available in stock`, 400);
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
    // Update dates if provided
    if (startDate && endDate) {
        cart.items[itemIndex].startDate = new Date(startDate);
        cart.items[itemIndex].endDate = new Date(endDate);
    }
    else {
        // Remove dates if not provided
        cart.items[itemIndex].startDate = undefined;
        cart.items[itemIndex].endDate = undefined;
    }
    await cart.save();
    const populatedCart = await cart.populate("items.product");
    console.log("✅ [SERVICE] Single item update completed");
    return populatedCart;
};
// Multiple items update (internal function)
const updateMultipleCartItems = async (userId, items) => {
    console.log("📦 [SERVICE] Updating multiple items:", { count: items.length });
    // Validate all product IDs first
    const invalidProductIds = items.filter((item) => !mongoose_1.Types.ObjectId.isValid(item.productId));
    if (invalidProductIds.length > 0) {
        throw new apiError_1.default(`Invalid product IDs: ${invalidProductIds
            .map((item) => item.productId)
            .join(", ")}`, 400);
    }
    // Validate all items have required fields
    for (const item of items) {
        if (item.quantity < 1) {
            throw new apiError_1.default("Quantity must be at least 1", 400);
        }
        // Validate date ranges
        if (item.startDate || item.endDate) {
            if (!item.startDate || !item.endDate) {
                throw new apiError_1.default("Both startDate and endDate are required for booking items", 400);
            }
            const startDate = new Date(item.startDate);
            const endDate = new Date(item.endDate);
            if (startDate >= endDate) {
                throw new apiError_1.default("End date must be after start date", 400);
            }
            if (startDate < new Date()) {
                throw new apiError_1.default("Start date cannot be in the past", 400);
            }
        }
    }
    // Convert productIds to ObjectId for query
    const productIds = items.map((item) => new mongoose_1.Types.ObjectId(item.productId));
    // Validate all products exist and check stock
    const products = await product_model_1.default.find({ _id: { $in: productIds } });
    // Check if all products exist
    const foundProductIds = products.map((p) => p._id.toString());
    const requestedProductIds = items.map((item) => item.productId);
    const missingProducts = requestedProductIds.filter((id) => !foundProductIds.includes(id));
    if (missingProducts.length > 0) {
        throw new apiError_1.default(`Products not found: ${missingProducts.join(", ")}`, 404);
    }
    // Create a product map for easier lookup
    const productMap = new Map();
    products.forEach((product) => {
        productMap.set(product._id.toString(), product);
    });
    // Check stock for each item
    for (const item of items) {
        const product = productMap.get(item.productId);
        if (product.stock < item.quantity) {
            throw new apiError_1.default(`Only ${product.stock} items available in stock for product ${product.name}`, 400);
        }
    }
    const cart = await cart_model_1.default.findOne({ user: new mongoose_1.Types.ObjectId(userId) });
    if (!cart) {
        throw new apiError_1.default("Cart not found", 404);
    }
    // Update each item in the cart
    for (const item of items) {
        const itemIndex = cart.items.findIndex((cartItem) => cartItem.product.toString() === item.productId);
        if (itemIndex === -1) {
            throw new apiError_1.default(`Item with productId ${item.productId} not found in cart`, 404);
        }
        // Update quantity
        cart.items[itemIndex].quantity = item.quantity;
        // Update dates if provided
        if (item.startDate && item.endDate) {
            cart.items[itemIndex].startDate = new Date(item.startDate);
            cart.items[itemIndex].endDate = new Date(item.endDate);
        }
        else {
            // Remove dates if not provided
            cart.items[itemIndex].startDate = undefined;
            cart.items[itemIndex].endDate = undefined;
        }
    }
    await cart.save();
    const populatedCart = await cart.populate("items.product");
    console.log("✅ [SERVICE] Multiple items update completed");
    return populatedCart;
};
// Get user's cart
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
// Remove item from cart
const removeItemFromCart = async (userId, productId) => {
    console.log("🗑️ [SERVICE] Removing item from cart:", { userId, productId });
    const cart = await cart_model_1.default.findOne({ user: new mongoose_1.Types.ObjectId(userId) });
    if (!cart) {
        throw new apiError_1.default("Cart not found", 404);
    }
    cart.items = cart.items.filter((item) => item.product.toString() !== productId);
    await cart.save();
    const populatedCart = await cart.populate("items.product");
    console.log("✅ [SERVICE] Item removed from cart successfully");
    return populatedCart;
};
exports.removeItemFromCart = removeItemFromCart;
// Clear entire cart
const clearCart = async (userId) => {
    console.log("🧹 [SERVICE] Clearing cart for user:", userId);
    const cart = await cart_model_1.default.findOne({ user: new mongoose_1.Types.ObjectId(userId) });
    if (!cart) {
        throw new apiError_1.default("Cart not found", 404);
    }
    cart.items = [];
    await cart.save();
    console.log("✅ [SERVICE] Cart cleared successfully");
    return cart;
};
exports.clearCart = clearCart;
// Add multiple items to cart
const addMultipleItemsToCart = async (userId, items) => {
    console.log("📦 [SERVICE] Adding multiple items to cart:", {
        userId,
        itemsCount: items.length,
    });
    // Validate all product IDs first
    const invalidProductIds = items.filter((item) => !mongoose_1.Types.ObjectId.isValid(item.productId));
    if (invalidProductIds.length > 0) {
        throw new apiError_1.default(`Invalid product IDs: ${invalidProductIds
            .map((item) => item.productId)
            .join(", ")}`, 400);
    }
    // Validate date ranges
    for (const item of items) {
        if (item.startDate || item.endDate) {
            if (!item.startDate || !item.endDate) {
                throw new apiError_1.default("Both startDate and endDate are required for booking items", 400);
            }
            const startDate = new Date(item.startDate);
            const endDate = new Date(item.endDate);
            if (startDate >= endDate) {
                throw new apiError_1.default("End date must be after start date", 400);
            }
            if (startDate < new Date()) {
                throw new apiError_1.default("Start date cannot be in the past", 400);
            }
        }
    }
    // Convert productIds to ObjectId for query
    const productIds = items.map((item) => new mongoose_1.Types.ObjectId(item.productId));
    // Validate all products exist
    const products = await product_model_1.default.find({ _id: { $in: productIds } });
    // Check if all products exist
    const foundProductIds = products.map((p) => p._id.toString());
    const requestedProductIds = items.map((item) => item.productId);
    const missingProducts = requestedProductIds.filter((id) => !foundProductIds.includes(id));
    if (missingProducts.length > 0) {
        throw new apiError_1.default(`Products not found: ${missingProducts.join(", ")}`, 404);
    }
    // Create a product map for easier lookup
    const productMap = new Map();
    products.forEach((product) => {
        productMap.set(product._id.toString(), product);
    });
    // Check stock for each item
    for (const item of items) {
        const product = productMap.get(item.productId);
        if (product.stock < item.quantity) {
            throw new apiError_1.default(`Only ${product.stock} items available in stock for product ${product.name}`, 400);
        }
    }
    let cart = await cart_model_1.default.findOne({ user: new mongoose_1.Types.ObjectId(userId) });
    if (!cart) {
        // Create new cart with all items
        const cartItems = items.map((item) => {
            const product = productMap.get(item.productId);
            const cartItem = {
                product: new mongoose_1.Types.ObjectId(item.productId),
                quantity: item.quantity,
                price: product.price,
            };
            // Add dates if provided
            if (item.startDate && item.endDate) {
                cartItem.startDate = new Date(item.startDate);
                cartItem.endDate = new Date(item.endDate);
            }
            return cartItem;
        });
        cart = await cart_model_1.default.create({
            user: new mongoose_1.Types.ObjectId(userId),
            items: cartItems,
        });
    }
    else {
        // Update existing cart with multiple items
        for (const item of items) {
            const product = productMap.get(item.productId);
            const existingItemIndex = cart.items.findIndex((cartItem) => cartItem.product.toString() === item.productId);
            if (existingItemIndex > -1) {
                // Update existing item
                const newQuantity = cart.items[existingItemIndex].quantity + item.quantity;
                // Check stock again for updated quantity
                if (product.stock < newQuantity) {
                    throw new apiError_1.default(`Only ${product.stock} items available in stock for product ${product.name}`, 400);
                }
                cart.items[existingItemIndex].quantity = newQuantity;
                // Update dates if provided
                if (item.startDate && item.endDate) {
                    cart.items[existingItemIndex].startDate = new Date(item.startDate);
                    cart.items[existingItemIndex].endDate = new Date(item.endDate);
                }
            }
            else {
                // Add new item
                const newItem = {
                    product: new mongoose_1.Types.ObjectId(item.productId),
                    quantity: item.quantity,
                    price: product.price,
                };
                // Add dates if provided
                if (item.startDate && item.endDate) {
                    newItem.startDate = new Date(item.startDate);
                    newItem.endDate = new Date(item.endDate);
                }
                cart.items.push(newItem);
            }
        }
        await cart.save();
    }
    const populatedCart = await cart.populate("items.product");
    console.log("✅ [SERVICE] Multiple items added to cart successfully");
    return populatedCart;
};
exports.addMultipleItemsToCart = addMultipleItemsToCart;
// Add single item to cart
const addItemToCart = async (userId, productId, quantity = 1, startDate, endDate) => {
    console.log("🛒 [SERVICE] Adding single item to cart:", {
        userId,
        productId,
        quantity,
    });
    // Validate if productId is a valid ObjectId
    if (!mongoose_1.Types.ObjectId.isValid(productId)) {
        throw new apiError_1.default("Invalid product ID", 400);
    }
    // Validate date ranges
    if (startDate || endDate) {
        if (!startDate || !endDate) {
            throw new apiError_1.default("Both startDate and endDate are required for booking items", 400);
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start >= end) {
            throw new apiError_1.default("End date must be after start date", 400);
        }
        if (start < new Date()) {
            throw new apiError_1.default("Start date cannot be in the past", 400);
        }
    }
    const product = await product_model_1.default.findById(productId);
    if (!product) {
        throw new apiError_1.default("Product not found", 404);
    }
    if (quantity < 1) {
        throw new apiError_1.default("Quantity must be at least 1", 400);
    }
    if (product.stock < quantity) {
        throw new apiError_1.default(`Only ${product.stock} items available in stock`, 400);
    }
    let cart = await cart_model_1.default.findOne({ user: new mongoose_1.Types.ObjectId(userId) });
    if (!cart) {
        const newItem = {
            product: new mongoose_1.Types.ObjectId(productId),
            quantity,
            price: product.price,
        };
        // Add dates if provided
        if (startDate && endDate) {
            newItem.startDate = new Date(startDate);
            newItem.endDate = new Date(endDate);
        }
        cart = await cart_model_1.default.create({
            user: new mongoose_1.Types.ObjectId(userId),
            items: [newItem],
        });
    }
    else {
        const existingItemIndex = cart.items.findIndex((item) => item.product.toString() === productId);
        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += quantity;
            // Update dates if provided
            if (startDate && endDate) {
                cart.items[existingItemIndex].startDate = new Date(startDate);
                cart.items[existingItemIndex].endDate = new Date(endDate);
            }
        }
        else {
            const newItem = {
                product: new mongoose_1.Types.ObjectId(productId),
                quantity,
                price: product.price,
            };
            // Add dates if provided
            if (startDate && endDate) {
                newItem.startDate = new Date(startDate);
                newItem.endDate = new Date(endDate);
            }
            cart.items.push(newItem);
        }
        await cart.save();
    }
    const populatedCart = await cart.populate("items.product");
    console.log("✅ [SERVICE] Single item added to cart successfully");
    return populatedCart;
};
exports.addItemToCart = addItemToCart;
