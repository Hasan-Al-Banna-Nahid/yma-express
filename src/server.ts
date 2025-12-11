import dotenv from "dotenv";
dotenv.config();
import http from "http";
import app from "./app";
import { config } from "../src/app/config/config";
import connectDB from "../src/app/config/db";

const server = http.createServer(app);

server.listen(config.port, async () => {
  console.log(`Server running on port ${config.port}`);
});
// 4) DATABASE CONNECTION
connectDB();

process.on("unhandledRejection", (err: Error) => {
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
