import express from "express";
import * as cartController from "../controllers/cart.controller";
import { protectRoute } from "../middlewares/auth.middleware";

const router = express.Router();

// All cart routes require authentication
router.use(protectRoute);

// GET /api/v1/cart - Get user's cart
// POST /api/v1/cart - Add item to cart (single or multiple)
// DELETE /api/v1/cart - Clear entire cart
router
  .route("/")
  .get(cartController.getCart)
  .post(cartController.addToCart)
  .delete(cartController.clearCart);

// PATCH /api/v1/cart/items - Update single OR multiple cart items
router.patch("/items", cartController.updateCartItems);

// DELETE /api/v1/cart/items/:productId - Remove specific item from cart
router.delete("/items/:productId", cartController.removeFromCart);

export default router;
