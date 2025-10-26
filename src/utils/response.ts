import type { Response } from "express";

export const success = (res: Response, data: any, status = 200) => {
  return res.status(status).json({ success: true, data });
};

export const error = (res: Response, message: string, detail?: string, status = 500) => {
  return res.status(status).json({ success: false, message, detail });
};
