import { Request, Response, NextFunction } from "express";

type CacheEntry = {
  data: any;
  expiry: number;
};

const cache = new Map<string, CacheEntry>();
const TTL = 60 * 1000; // 60s

export const globalCache = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const key = `${req.method}:${req.originalUrl}`;

  /* ---------------- GET ---------------- */
  if (req.method === "GET") {
    const cached = cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return res.json(cached.data);
    }

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      cache.set(key, {
        data: body,
        expiry: Date.now() + TTL,
      });
      return originalJson(body);
    };
  }

  /* -------- WRITE METHODS (INVALIDATE) -------- */
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    res.on("finish", () => {
      for (const k of cache.keys()) {
        // Invalidate same resource cache
        if (k.includes(req.baseUrl)) {
          cache.delete(k);
        }
      }
    });
  }

  next();
};
