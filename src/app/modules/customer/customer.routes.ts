import { Router } from "express";
import { CustomerController } from "./customer.controller";
import { protectRoute } from "../../middlewares/auth.middleware";

const router = Router();

/**
 * Customers
 */

// GET /api/customers
// List customers with filters + pagination
router.get("/", CustomerController.getCustomers);

// GET /api/customers/:customerId
// Get customer detail + recent orders
router.get("/:customerId", CustomerController.getCustomerDetail);

// POST /api/customers/orders/:orderId/reorder
// Prepare reorder (auth required)
router.post(
  "/orders/reorder/:orderId",
  protectRoute,
  CustomerController.prepareReorder,
);

export default router;
