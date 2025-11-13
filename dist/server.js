"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const config_1 = require("./app/config/config");
const db_1 = __importDefault(require("./app/config/db"));
const email_service_1 = require("./app/services/email.service");
const server = http_1.default.createServer(app_1.default);
server.listen(config_1.config.port, async () => {
    await (0, email_service_1.warmupEmail)();
    console.log(`Server running on port ${config_1.config.port}`);
});
// 4) DATABASE CONNECTION
(0, db_1.default)();
process.on("unhandledRejection", (err) => {
    console.log("Unhandled Rejection:", err);
    server.close(() => {
        process.exit(1);
    });
});
process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down gracefully");
    server.close(() => {
        console.log("Process terminated");
    });
});
