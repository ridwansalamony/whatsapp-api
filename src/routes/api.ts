import express from "express";
import type { Router } from "express";
import appController from "../controllers/app.controller";

const router: Router = express.Router();

/**
 * @route   GET /api/whatsapp/groups
 * @desc    Get all WhatsApp groups
 */
router.get("/whatsapp/groups", appController.getGroups);

/**
 * @route   POST /api/whatsapp/send-personal
 * @desc    Send personal message to specific user
 */
router.post("/whatsapp/send-personal", appController.sendPersonal);

/**
 * @route   POST /api/whatsapp/send-group
 * @desc    Send message to WhatsApp group
 */
router.post("/whatsapp/send-group", appController.sendGroup);

export default router;
