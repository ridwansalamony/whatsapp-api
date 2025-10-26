import type { Request, Response } from "express";
import appService from "../services/app.service";
import { success, error } from "../utils/response";

// Wrapper async agar tak perlu try/catch di tiap route
const asyncHandler = (fn: any) => (req: Request, res: Response, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default {
  sendPersonal: asyncHandler(async (req: Request, res: Response) => {
    const { to, message } = req.body;
    if (!to || !message) return error(res, "Missing 'to' or 'message'", undefined, 400);

    const response = await appService.sendPersonal({ to, message });
    return success(res, { to, message, response });
  }),

  sendGroup: asyncHandler(async (req: Request, res: Response) => {
    const { to, message } = req.body;
    if (!to || !message) return error(res, "Missing 'to' or 'message'", undefined, 400);

    const response = await appService.sendGroup({ to, message });
    return success(res, { to, message, response });
  }),

  getGroups: asyncHandler(async (_req: Request, res: Response) => {
    const response = await appService.getGroups();
    return success(res, response);
  }),
};
