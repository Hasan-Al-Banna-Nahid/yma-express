import { Request, Response, NextFunction } from "express";

export const requestPerformance = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    console.log(
      `[${req.method}] ${req.originalUrl} → ${res.statusCode} | ${durationMs.toFixed(
        2,
      )} ms`,
    );
  });

  next();
};
