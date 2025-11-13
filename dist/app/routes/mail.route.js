"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mail_controller_1 = require("../controllers/mail.controller");
const router = (0, express_1.Router)();
// Public endpoint
router.post("/send", mail_controller_1.sendMailController);
exports.default = router;
