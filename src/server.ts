import dotenv from "dotenv";
dotenv.config();
import http from "http";
import app from "./app";
import { config } from "./app/config/config";
import connectDB from "./app/config/db";
import { warmupEmail } from "./app/services/email.service";

const server = http.createServer(app);

server.listen(config.port, async () => {
  await warmupEmail();

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
