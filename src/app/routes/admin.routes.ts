import { Router } from "express";
import {
    listUsers,
    getUser,
    updateUserRole,
    adminUpdateUser,
    softDeleteUser,
    hardDeleteUser,
} from "../controllers/admin.controller";
import { protectRoute, restrictTo } from "../middlewares/auth.middleware";

const router = Router();

router.use(protectRoute);
router.use(restrictTo("admin"));

router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.patch("/users/:id/role", updateUserRole);
router.patch("/users/:id", adminUpdateUser);
router.delete("/users/:id", softDeleteUser);
router.delete("/users/:id/hard", hardDeleteUser);

export default router;
