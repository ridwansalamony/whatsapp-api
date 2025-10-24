import type { Request, Response, NextFunction } from "express";
import appService from "../services/app.service";

export type TSendMessages = {
  to: string;
  message: string;
};

export default {
  async send(req: Request, res: Response, next: NextFunction) {
    try {
      const { to, message }: TSendMessages = req.body;

      if (!to || !message) return res.status(400).json({ error: "Missing to or message" });
      const response = await appService.send({ to, message });

      res.status(200).json({ success: true, to, message, response });
    } catch (error) {
      console.error("Send controller error:", error);
      // Kirim detail error untuk debugging (di production sebaiknya ringkas)
      return res.status(500).json({ error: "Failed to send message", detail: (error as Error).message });
    }
  },
};
