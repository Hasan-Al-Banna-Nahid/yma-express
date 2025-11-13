"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("./config");
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(config_1.config.mongo.uri, {
            dbName: 'YMA', // optional override (ensures YMA even if URI has /test)
        });
        console.log('MongoDB connected successfully');
    }
    catch (error) {
        console.log('MongoDB connection error:', error);
        process.exit(1);
    }
};
mongoose_1.default.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});
mongoose_1.default.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
});
process.on('SIGINT', async () => {
    await mongoose_1.default.connection.close();
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
});
exports.default = connectDB;
