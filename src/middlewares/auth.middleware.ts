import { Request, Response, NextFunction } from "express";
import { API_KEY } from "../utils/env";

export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  // If no API_KEY is set in environment, allow requests freely
  if (!API_KEY) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const headerKey = req.headers["x-api-key"];

  let providedKey: string | undefined;

  if (typeof headerKey === "string") {
    providedKey = headerKey;
  } else if (authHeader && authHeader.startsWith("Bearer ")) {
    providedKey = authHeader.substring(7).trim();
  }

  if (!providedKey || providedKey !== API_KEY) {
    res.status(401).json({
      success: false,
      error: "Unauthorized: API Key tidak valid atau belum disertakan (gunakan header 'x-api-key' atau 'Authorization: Bearer <token>').",
    });
    return;
  }

  next();
};
