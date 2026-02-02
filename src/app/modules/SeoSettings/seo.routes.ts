import express from "express";
import { protectRoute } from "../../middlewares/auth.middleware";
import { restrictTo } from "../../middlewares/authorization.middleware";
import {
  getSeoSettings,
  resetSeoSettings,
  updateSeoSettings,
} from "./seo.controller";

const router = express.Router();

router.get("/", getSeoSettings);

router.use(protectRoute);
router.use(restrictTo("admin", "superadmin"));

router.patch("/", updateSeoSettings);
router.post("/reset", resetSeoSettings);

export default router;
