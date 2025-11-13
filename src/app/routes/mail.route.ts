import { Router } from "express";
import { sendMailController } from "../controllers/mail.controller";

const router = Router();

// Public endpoint
router.post("/send", sendMailController);

export default router;
