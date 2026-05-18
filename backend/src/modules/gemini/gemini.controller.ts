import { Request, Response } from "express";
import { GeminiService } from "./gemini.service";
import { WalletService } from "../wallet/wallet.service";

export class GeminiController {
	// Handler untuk POST /api/gemini/parse
	static async parseText(req: Request, res: Response): Promise<void> {
		try {
			const { text } = req.body;
			const userId = (req as any).user.id; // Deteksi otomatis daftar wallet berdasarkan token

			if (!text) {
				res.status(400).json({ success: false, message: "Kolom 'text' catatan wajib diisi" });
				return;
			}

			// Ambil dompet asli pemilik token
			const userWallets = await WalletService.getWalletsByUser(userId);

			if (userWallets.length === 0) {
				res.status(400).json({
					success: false,
					message: "User belum memiliki dompet. Silakan buat dompet terlebih dahulu sebelum menggunakan AI.",
				});
				return;
			}

			const structuredSuggestion = await GeminiService.parseTransactionText(text, userWallets);

			res.status(200).json({
				success: true,
				message: "Gemini AI Berhasil memberikan suggestion form",
				suggestion: structuredSuggestion,
			});
		} catch (error: any) {
			res.status(500).json({ success: false, message: error.message });
		}
	}
	
}
