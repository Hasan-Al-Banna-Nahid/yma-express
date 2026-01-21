import { Router } from "express";
import { PromoController } from "./promos.controller";
import { protectRoute } from "../../middlewares/auth.middleware";
import { restrictTo } from "../../middlewares/authorization.middleware";

const router = Router();
const promoController = new PromoController();

router.use(protectRoute);
router.use(restrictTo("admin", "superadmin"));

router.post("/promos", promoController.createPromo);
router.get("/promos", promoController.getAllPromos);
router.get("/promos/active", promoController.getActivePromos);
router.get("/promos/:id", promoController.getPromoById);
router.put("/promos/:id", promoController.updatePromo);
router.delete("/promos/:id", promoController.deletePromo);
router.post("/promos/:id/apply", promoController.applyPromo);
router.post("/promos/validate", promoController.validatePromo);
router.get("/promos/stats/overview", promoController.getPromoStats);

router.get("/promos/:id/orders", promoController.getPromoOrders);
router.get("/promos/orders/all", promoController.getAllPromoOrders);

export default router;
