"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const checkUsers = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI ||
            process.env.MONGO_URI ||
            "mongodb://localhost:27017/yma";
        await mongoose_1.default.connect(mongoUri);
        const db = mongoose_1.default.connection.db;
        if (!db) {
            console.error("Error: MongoDB database connection not established.");
            await mongoose_1.default.disconnect();
            process.exit(1);
        }
        const usersCollection = db.collection("users");
        // Find ALL users with this email (there might be duplicates)
        const users = await usersCollection
            .find({
            email: "iamnahid591998@gmail.com",
        })
            .toArray();
        console.log(`📋 Found ${users.length} user(s) with email: iamnahid591998@gmail.com`);
        users.forEach((user, index) => {
            console.log(`\nUser ${index + 1}:`);
            console.log(`  ID: ${user._id}`);
            console.log(`  Name: ${user.name}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  Role: ${user.role}`);
            console.log(`  Created: ${user.createdAt}`);
        });
        await mongoose_1.default.disconnect();
    }
    catch (error) {
        console.error("Error:", error);
    }
};
checkUsers();
