"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLogger = exports.requestLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'logs/combined.log' }),
    ],
});
const requestLogger = (req, res, next) => {
    console.log({
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    next();
};
exports.requestLogger = requestLogger;
const errorLogger = (err, req, res, next) => {
    console.log({
        status: err.statusCode || 500,
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
    });
    next(err);
};
exports.errorLogger = errorLogger;
exports.default = logger;
