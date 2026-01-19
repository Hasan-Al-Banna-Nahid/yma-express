import express from "express";
import {
  getAllCustomersHandler,
  getCustomerByIdHandler,
  getCustomerByUserIdHandler,
  searchCustomersHandler,
  getCustomerOrderHistoryHandler,
  getCustomerStatsHandler,
  updateCustomerHandler,
  deleteCustomerHandler,
  getCustomersByDateRangeHandler,
  toggleFavoriteHandler,
  addCustomerTagHandler,
  removeCustomerTagHandler,
  getCustomerAnalyticsHandler,
} from "./customer.controller";
import { protectRoute } from "../../middlewares/auth.middleware";
import { restrictTo } from "../../middlewares/authorization.middleware";
const router = express.Router();

// Public routes (with authentication)
router.get(
  "/search",
  protectRoute,
  restrictTo("admin", "superadmin"),
  searchCustomersHandler,
);

// Protected routes for admins/superadmins only
router.use(protectRoute);
router.use(restrictTo("admin", "superadmin"));

router.get("/", getAllCustomersHandler);
router.get("/stats", getCustomerStatsHandler);
router.get("/analytics", getCustomerAnalyticsHandler);
router.get("/date-range", getCustomersByDateRangeHandler);
router.get("/:id", getCustomerByIdHandler);
router.get("/user/:userId", getCustomerByUserIdHandler);
router.get("/:customerId/orders", getCustomerOrderHistoryHandler);
router.put("/:id", updateCustomerHandler);
router.delete("/:id", deleteCustomerHandler);
router.patch("/:id/favorite", toggleFavoriteHandler);
router.post("/:id/tags", addCustomerTagHandler);
router.delete("/:id/tags", removeCustomerTagHandler);

export default router;
