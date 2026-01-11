import express from "express";
import { CustomerController } from "./customer.controller";
import { restrictTo } from "../../middlewares/authorization.middleware";
import { protectRoute } from "../../middlewares/auth.middleware";
const router = express.Router();

// Public routes
router.get("/search", CustomerController.searchCustomers);

// Protected routes (require authentication)
router.use(protectRoute);

// Admin only routes
router.use(restrictTo("admin", "superadmin"));

// Customer management
router.get("/", CustomerController.getAllCustomers);
router.get("/stats", CustomerController.getCustomerStats);
router.get("/user/:userId", CustomerController.getCustomerByUserId);

// Customer CRUD operations
router.get("/:id", CustomerController.getCustomerById);
router.put("/:id", CustomerController.updateCustomer);
router.delete("/:id", CustomerController.deleteCustomer);

// Customer actions
router.patch("/:id/favorite", CustomerController.toggleFavorite);
router.post("/:id/tags", CustomerController.addTag);
router.delete("/:id/tags", CustomerController.removeTag);

export default router;
