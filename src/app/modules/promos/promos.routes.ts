import { Router } from "express";
import { PromoController } from "./promos.controller";
import { protectRoute } from "../../middlewares/auth.middleware";
import { restrictTo } from "../../middlewares/authorization.middleware";
const router = Router();
const promoController = new PromoController();
router.use(protectRoute);
router.use(restrictTo("admin", "superadmin"));
// Create promo
router.post("/promos", promoController.createPromo);

// Get all promos
router.get("/promos", promoController.getAllPromos);

// Get active promos
router.get("/promos/active", promoController.getActivePromos);

// Get promo by ID
router.get("/promos/:id", promoController.getPromoById);

// Update promo
router.put("/promos/:id", promoController.updatePromo);

// Delete promo
router.delete("/promos/:id", promoController.deletePromo);

// Apply promo
router.post("/promos/:id/apply", promoController.applyPromo);

// Validate promo
router.post("/promos/validate", promoController.validatePromo);

// Get promo statistics
router.get("/promos/stats/overview", promoController.getPromoStats);

export default router;
