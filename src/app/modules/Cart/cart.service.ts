// cart.service.ts
import mongoose, { Types } from "mongoose";
import Cart from "./cart.model";
import Product from "../Product/product.model";
import ApiError from "../../utils/apiError";

// Get cart by user ID with populated products
export const getCartByUserId = async (userId: string) => {
  const cart = await Cart.findOne({ user: new Types.ObjectId(userId) })
    .populate({
      path: "items.product",
      select: "name imageCover price stock slug categories",
    })
    .lean();

  if (!cart) {
    // Return empty cart structure if no cart exists
    return {
      _id: null,
      user: new Types.ObjectId(userId),
      items: [],
      totalPrice: 0,
      totalItems: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return cart;
};

// Add single item to cart
export const addItemToCart = async (
  userId: string,
  productId: string,
  quantity: number,
  startDate?: Date,
  endDate?: Date
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("🛒 [CART SERVICE] Adding item to cart:", {
      userId,
      productId,
      quantity,
    });

    // Validate product exists
    const product = await Product.findById(productId).session(session);
    if (!product) {
      throw new ApiError("Product not found", 404);
    }

    // Validate stock
    if (product.stock < quantity) {
      throw new ApiError(
        `Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`,
        400
      );
    }

    // Find or create cart for user
    let cart = await Cart.findOne({ user: new Types.ObjectId(userId) }).session(
      session
    );

    if (!cart) {
      cart = new Cart({
        user: new Types.ObjectId(userId),
        items: [],
        totalPrice: 0,
        totalItems: 0,
      });
    }

    // Check if product already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update existing item
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].price = product.price;
      if (startDate) cart.items[existingItemIndex].startDate = startDate;
      if (endDate) cart.items[existingItemIndex].endDate = endDate;
    } else {
      // Add new item - Save product as ObjectId
      cart.items.push({
        product: new Types.ObjectId(productId),
        quantity,
        price: product.price,
        startDate,
        endDate,
      });
    }

    // Recalculate totals
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalPrice = cart.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    await cart.save({ session });
    await session.commitTransaction();
    session.endSession();

    console.log("✅ [CART SERVICE] Item added to cart successfully");

    // Return populated cart
    return await getCartByUserId(userId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ [CART SERVICE] Failed to add item to cart:", error);
    throw error;
  }
};

// Add multiple items to cart
export const addMultipleItemsToCart = async (
  userId: string,
  items: Array<{
    productId: string;
    quantity: number;
    startDate?: Date;
    endDate?: Date;
  }>
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("🛒 [CART SERVICE] Adding multiple items to cart:", {
      userId,
      itemCount: items.length,
    });

    // Find or create cart for user
    let cart = await Cart.findOne({ user: new Types.ObjectId(userId) }).session(
      session
    );

    if (!cart) {
      cart = new Cart({
        user: new Types.ObjectId(userId),
        items: [],
        totalPrice: 0,
        totalItems: 0,
      });
    }

    for (const item of items) {
      const { productId, quantity, startDate, endDate } = item;

      // Validate product exists
      const product = await Product.findById(productId).session(session);
      if (!product) {
        throw new ApiError(`Product ${productId} not found`, 404);
      }

      // Validate stock
      if (product.stock < quantity) {
        throw new ApiError(
          `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`,
          400
        );
      }

      // Check if product already exists in cart
      const existingItemIndex = cart.items.findIndex(
        (cartItem) => cartItem.product.toString() === productId
      );

      if (existingItemIndex > -1) {
        // Update existing item
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].price = product.price;
        if (startDate) cart.items[existingItemIndex].startDate = startDate;
        if (endDate) cart.items[existingItemIndex].endDate = endDate;
      } else {
        // Add new item - Save product as ObjectId
        cart.items.push({
          product: new Types.ObjectId(productId),
          quantity,
          price: product.price,
          startDate,
          endDate,
        });
      }
    }

    // Recalculate totals
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalPrice = cart.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    await cart.save({ session });
    await session.commitTransaction();
    session.endSession();

    console.log("✅ [CART SERVICE] Multiple items added to cart successfully");

    // Return populated cart
    return await getCartByUserId(userId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ [CART SERVICE] Failed to add items to cart:", error);
    throw error;
  }
};

// Update cart items
export const updateCartItems = async (
  userId: string,
  updateData: {
    items?: Array<{
      productId: string;
      quantity: number;
      startDate?: Date;
      endDate?: Date;
    }>;
    productId?: string;
    quantity?: number;
    startDate?: Date;
    endDate?: Date;
  }
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("🔄 [CART SERVICE] Updating cart items:", {
      userId,
      updateData,
    });

    const cart = await Cart.findOne({
      user: new Types.ObjectId(userId),
    }).session(session);

    if (!cart) {
      throw new ApiError("Cart not found", 404);
    }

    if (Array.isArray(updateData.items)) {
      // Update multiple items
      for (const updateItem of updateData.items) {
        const { productId, quantity, startDate, endDate } = updateItem;

        const existingItemIndex = cart.items.findIndex(
          (item) => item.product.toString() === productId
        );

        if (existingItemIndex > -1) {
          if (quantity === 0) {
            // Remove item if quantity is 0
            cart.items.splice(existingItemIndex, 1);
          } else {
            // Update existing item
            // Validate stock if increasing quantity
            if (quantity > cart.items[existingItemIndex].quantity) {
              const product = await Product.findById(productId).session(
                session
              );
              if (!product) {
                throw new ApiError(`Product ${productId} not found`, 404);
              }

              const quantityIncrease =
                quantity - cart.items[existingItemIndex].quantity;
              if (product.stock < quantityIncrease) {
                throw new ApiError(
                  `Insufficient stock for ${product.name}. Available: ${product.stock}, Additional requested: ${quantityIncrease}`,
                  400
                );
              }
            }

            cart.items[existingItemIndex].quantity = quantity;
            cart.items[existingItemIndex].price =
              (await Product.findById(productId))?.price ||
              cart.items[existingItemIndex].price;
            if (startDate) cart.items[existingItemIndex].startDate = startDate;
            if (endDate) cart.items[existingItemIndex].endDate = endDate;
          }
        } else if (quantity > 0) {
          // Add new item if quantity > 0
          const product = await Product.findById(productId).session(session);
          if (!product) {
            throw new ApiError(`Product ${productId} not found`, 404);
          }

          if (product.stock < quantity) {
            throw new ApiError(
              `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`,
              400
            );
          }

          cart.items.push({
            product: new Types.ObjectId(productId),
            quantity,
            price: product.price,
            startDate,
            endDate,
          });
        }
      }
    } else if (updateData.productId && updateData.quantity !== undefined) {
      // Update single item (backward compatibility)
      const { productId, quantity, startDate, endDate } = updateData;

      const existingItemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (existingItemIndex > -1) {
        if (quantity === 0) {
          // Remove item if quantity is 0
          cart.items.splice(existingItemIndex, 1);
        } else {
          // Update existing item
          // Validate stock if increasing quantity
          if (quantity > cart.items[existingItemIndex].quantity) {
            const product = await Product.findById(productId).session(session);
            if (!product) {
              throw new ApiError(`Product ${productId} not found`, 404);
            }

            const quantityIncrease =
              quantity - cart.items[existingItemIndex].quantity;
            if (product.stock < quantityIncrease) {
              throw new ApiError(
                `Insufficient stock for ${product.name}. Available: ${product.stock}, Additional requested: ${quantityIncrease}`,
                400
              );
            }
          }

          cart.items[existingItemIndex].quantity = quantity;
          cart.items[existingItemIndex].price =
            (await Product.findById(productId))?.price ||
            cart.items[existingItemIndex].price;
          if (startDate) cart.items[existingItemIndex].startDate = startDate;
          if (endDate) cart.items[existingItemIndex].endDate = endDate;
        }
      } else if (quantity > 0) {
        // Add new item if quantity > 0
        const product = await Product.findById(productId).session(session);
        if (!product) {
          throw new ApiError(`Product ${productId} not found`, 404);
        }

        if (product.stock < quantity) {
          throw new ApiError(
            `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`,
            400
          );
        }

        cart.items.push({
          product: new Types.ObjectId(productId),
          quantity,
          price: product.price,
          startDate,
          endDate,
        });
      }
    }

    // Recalculate totals
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalPrice = cart.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    await cart.save({ session });
    await session.commitTransaction();
    session.endSession();

    console.log("✅ [CART SERVICE] Cart updated successfully");

    // Return populated cart
    return await getCartByUserId(userId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ [CART SERVICE] Failed to update cart:", error);
    throw error;
  }
};

// Remove item from cart
export const removeItemFromCart = async (userId: string, productId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("🗑️ [CART SERVICE] Removing item from cart:", {
      userId,
      productId,
    });

    const cart = await Cart.findOne({
      user: new Types.ObjectId(userId),
    }).session(session);

    if (!cart) {
      throw new ApiError("Cart not found", 404);
    }

    // Find and remove the item
    const initialLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    if (cart.items.length === initialLength) {
      throw new ApiError("Item not found in cart", 404);
    }

    // Recalculate totals
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalPrice = cart.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    await cart.save({ session });
    await session.commitTransaction();
    session.endSession();

    console.log("✅ [CART SERVICE] Item removed from cart successfully");

    // Return populated cart
    return await getCartByUserId(userId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ [CART SERVICE] Failed to remove item from cart:", error);
    throw error;
  }
};

// Clear cart
export const clearCart = async (userId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("🧹 [CART SERVICE] Clearing cart for user:", userId);

    const cart = await Cart.findOne({
      user: new Types.ObjectId(userId),
    }).session(session);

    if (!cart) {
      throw new ApiError("Cart not found", 404);
    }

    // Clear all items
    cart.items = [];
    cart.totalPrice = 0;
    cart.totalItems = 0;

    await cart.save({ session });
    await session.commitTransaction();
    session.endSession();

    console.log("✅ [CART SERVICE] Cart cleared successfully");

    // Return empty cart
    return await getCartByUserId(userId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ [CART SERVICE] Failed to clear cart:", error);
    throw error;
  }
};

// Get cart summary (optional)
export const getCartSummary = async (userId: string) => {
  const cart = await Cart.findOne({ user: new Types.ObjectId(userId) })
    .populate({
      path: "items.product",
      select: "name imageCover price",
    })
    .lean();

  if (!cart) {
    return {
      totalItems: 0,
      totalPrice: 0,
      items: [],
    };
  }

  return {
    totalItems: cart.totalItems,
    totalPrice: cart.totalPrice,
    items: cart.items.map((item: any) => ({
      product: item.product,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.quantity * item.price,
      startDate: item.startDate,
      endDate: item.endDate,
    })),
  };
};
