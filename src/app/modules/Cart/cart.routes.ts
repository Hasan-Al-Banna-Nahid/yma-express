import express from "express";
import {
  getCart,
  addToCart,
  updateCartItems,
  removeFromCart,
  clearCart,
  getCartSummary,
} from "./cart.controller";

const router = express.Router();

/**
 * No Auth
 * No DB
 * In-memory cart
 */

router
  .route("/")
  .get(getCart) // GET    /api/cart
  .post(addToCart) // POST   /api/cart
  .put(updateCartItems) // PUT    /api/cart
  .delete(clearCart); // DELETE /api/cart

router.get("/summary", getCartSummary); // GET /api/cart/summary
router.delete("/:productId", removeFromCart); // DELETE /api/cart/:productId

export default router;
