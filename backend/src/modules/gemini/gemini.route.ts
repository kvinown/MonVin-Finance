import { Router } from "express";
import { GeminiController } from "./gemini.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/parse", authenticate, GeminiController.parseText);

export default router;
