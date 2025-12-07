"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoiceHtml = generateInvoiceHtml;
exports.generateAdminInvoiceHtml = generateAdminInvoiceHtml;
// src/services/invoice.service.ts
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
async function generateInvoiceHtml(order) {
    const templatePath = path_1.default.resolve(process.cwd(), "src", "views", "emails", "invoice.ejs");
    if (!fs_1.default.existsSync(templatePath)) {
        throw new Error("Invoice template not found");
    }
    const templateVars = {
        order,
        company: {
            name: "YMA Bouncy Castle",
            address: "123 Party Street, Entertainment City",
            phone: "+1 (555) 123-4567",
            email: "info@ymabouncycastle.com",
            website: "www.ymabouncycastle.com",
        },
        currentDate: new Date().toLocaleDateString(),
        year: new Date().getFullYear(),
    };
    return await ejs_1.default.renderFile(templatePath, templateVars, { async: true });
}
async function generateAdminInvoiceHtml(order) {
    const templatePath = path_1.default.resolve(process.cwd(), "src", "views", "emails", "admin-invoice.ejs");
    if (!fs_1.default.existsSync(templatePath)) {
        throw new Error("Admin invoice template not found");
    }
    const templateVars = {
        order,
        company: {
            name: "YMA Bouncy Castle",
            address: "123 Party Street, Entertainment City",
            phone: "+1 (555) 123-4567",
            email: "info@ymabouncycastle.com",
            website: "www.ymabouncycastle.com",
            taxId: "TAX-123-456-789",
        },
        currentDate: new Date().toLocaleDateString(),
        year: new Date().getFullYear(),
    };
    return await ejs_1.default.renderFile(templatePath, templateVars, { async: true });
}
