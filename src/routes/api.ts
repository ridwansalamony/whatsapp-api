import express, { Router } from "express";
import appController from "../controllers/app.controller";
import { apiKeyAuth } from "../middlewares/auth.middleware";

const router: Router = express.Router();

// Public routes for monitoring & linking
router.get("/status", appController.status);
router.get("/qr", appController.qrView);

// Protected routes (require API_KEY if configured in .env)
router.post("/send-message", apiKeyAuth, appController.send);
router.get("/whatsapp/groups", apiKeyAuth, appController.getGroups);
router.post("/whatsapp/send-personal", apiKeyAuth, appController.send);  // alias → same handler as /send-message
router.post("/whatsapp/send-group", apiKeyAuth, appController.sendGroup);
router.get("/logs", apiKeyAuth, appController.logs);

export default router;
