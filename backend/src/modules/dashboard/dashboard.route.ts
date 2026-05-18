import { Router } from "express";
import { DashboardController } from "./dashboard.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// Endpoint untuk load awal (Cepat & Murni DB)
router.get("/", authenticate, DashboardController.getDashboard);

// Endpoint khusus analisis (Makan token, dipanggil manual)
router.get("/insight", authenticate, DashboardController.getInsight);

export default router;
