"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAddressBody = void 0;
const apiError_1 = __importDefault(require("../utils/apiError"));
const validate = (schema) => async (req, res, next) => {
    try {
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        return next();
    }
    catch (error) {
        throw new apiError_1.default("Validation failed", 400, error.errors);
    }
};
// src/middleware/validators.ts
const validateAddressBody = (req, res, next) => {
    const { fullName, line1, city, postalCode, country } = req.body || {};
    const missing = [];
    if (!fullName)
        missing.push("fullName");
    if (!line1)
        missing.push("line1");
    if (!city)
        missing.push("city");
    if (!postalCode)
        missing.push("postalCode");
    if (!country)
        missing.push("country");
    if (missing.length) {
        return res.status(400).json({
            status: "fail",
            message: `Missing required address fields: ${missing.join(", ")}`,
        });
    }
    next();
};
exports.validateAddressBody = validateAddressBody;
exports.default = validate;
