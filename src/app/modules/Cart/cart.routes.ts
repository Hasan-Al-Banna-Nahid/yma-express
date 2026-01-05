import express from "express";
import {
  getCart,
  addToCart,
  updateCartItems,
  removeFromCart,
  clearCart,
  getCartSummary,
} from "./cart.controller";
import { protectRoute } from "../../middlewares/auth.middleware"; // Correct import

const router = express.Router();

// All cart routes require authentication
router.use(protectRoute); // Correct middleware usage

router
  .route("/")
  .get(getCart) // GET /api/cart - Get cart
  .post(addToCart) // POST /api/cart - Add item(s) to cart
  .put(updateCartItems) // PUT /api/cart - Update cart items
  .delete(clearCart); // DELETE /api/cart - Clear cart

router.get("/summary", getCartSummary); // GET /api/cart/summary - Get cart summary
router.delete("/:productId", removeFromCart); // DELETE /api/cart/:productId - Remove specific item

export default router;
