import { Request, Response } from "express";
import { WalletService } from "./wallet.service";

export class WalletController {
	// Handler untuk POST /api/wallets
	static async create(req: Request, res: Response): Promise<void> {
		try {
			const { name, type, balance } = req.body;
			// Mengambil ID otomatis dari middleware autentikasi JWT
			const userId = (req as any).user.id;

			if (!name || !type) {
				res.status(400).json({ success: false, message: "Kolom name dan type wajib diisi" });
				return;
			}

			const newWallet = await WalletService.createWallet(userId, name, type, balance);
			res.status(201).json({ success: true, message: "Dompet berhasil dibuat", data: newWallet });
		} catch (error: any) {
			res.status(400).json({ success: false, message: error.message });
		}
	}

	// Handler untuk GET /api/wallets
	static async getMyWallets(req: Request, res: Response): Promise<void> {
		try {
			// Tidak perlu lagi membaca dari query string (?userId=...)
			const userId = (req as any).user.id;

			const wallets = await WalletService.getWalletsByUser(userId);
			res.status(200).json({ success: true, data: wallets });
		} catch (error: any) {
			res.status(500).json({ success: false, message: error.message });
		}
	}
	static async delete(req: Request, res: Response): Promise<void> {
		try {
			const { id } = req.params;
			const userId = (req as any).user.id;

			await WalletService.deleteWallet(id, userId);
			res.status(200).json({ success: true, message: "Dompet berhasil dinonaktifkan" });
		} catch (error: any) {
			res.status(400).json({ success: false, message: error.message });
		}
	}
	static async transfer(req: Request, res: Response): Promise<void> {
		try {
			const userId = (req as any).user.id;
			const { sourceWalletId, destinationWalletId, amount } = req.body;

			if (!sourceWalletId || !destinationWalletId || !amount) {
				res.status(400).json({
					status: "error",
					message: "Kolom sourceWalletId, destinationWalletId, dan amount wajib diisi",
				});
				return;
			}

			const result = await WalletService.transferBalance(userId, sourceWalletId, destinationWalletId, amount);

			res.status(200).json({
				success: true,
				message: "Transfer antar dompet berhasil dilakukan",
				data: result,
			});
		} catch (error: any) {
			// Sesuai standarisasi error kontrak yang baru
			res.status(400).json({
				status: "error",
				message: error.message,
			});
		}
}
}
