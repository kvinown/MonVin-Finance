import { Request, Response } from "express";
import { DashboardService } from "./dashboard.service";

export class DashboardController {
	// Dipanggil saat awal halaman dashboard dibuka
	static async getDashboard(req: Request, res: Response): Promise<void> {
		try {
			const userId = (req as any).user.id;
			const data = await DashboardService.getSummaryData(userId);
			res.status(200).json({ success: true, data });
		} catch (error: any) {
			res.status(500).json({ success: false, message: error.message });
		}
	}

	// Dipanggil HANYA KETIKA user menekan tombol "Minta Saran AI"
	static async getInsight(req: Request, res: Response): Promise<void> {
		try {
			const userId = (req as any).user.id;
			const data = await DashboardService.getAiInsight(userId);
			res.status(200).json({ success: true, data });
		} catch (error: any) {
			res.status(500).json({ success: false, message: error.message });
		}
	}
}
