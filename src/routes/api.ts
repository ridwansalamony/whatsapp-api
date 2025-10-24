import express from "express";
import type { Router } from "express";
import appController from "../controllers/app.controller";

const router: Router = express.Router();

router.post("/send-message", appController.send);

export default router;
