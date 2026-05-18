import { Request, Response } from "express";
import { TransactionService } from "./transaction.service";

export class TransactionController {
	// Handler untuk POST /api/transactions
	static async create(req: Request, res: Response): Promise<void> {
		try {
			const { walletId, categoryId, amount, note, date } = req.body;
			const userId = (req as any).user.id; // Diambil aman dari token JWT

			if (!walletId || !categoryId || !amount) {
				res.status(400).json({ success: false, message: "Kolom walletId, categoryId, dan amount wajib diisi" });
				return;
			}

			const transaction = await TransactionService.createTransaction({
				userId,
				walletId,
				categoryId,
				amount,
				note,
				date,
			});

			res.status(201).json({ success: true, message: "Transaksi berhasil dicatat", data: transaction });
		} catch (error: any) {
			res.status(400).json({ success: false, message: error.message });
		}
	}

	// Handler untuk GET /api/transactions
	static async getMyHistory(req: Request, res: Response): Promise<void> {
		try {
			const userId = (req as any).user.id;

			// Tangkap parameter dari URL query strings (?page=1&limit=10&type=EXPENSE)
			const page = parseInt(req.query.page as string) || 1;
			const limit = parseInt(req.query.limit as string) || 10;
			const type = req.query.type as string;

			const result = await TransactionService.getTransactionsByUser(userId, page, limit, type);

			res.status(200).json({
				success: true,
				data: result.data,
				pagination: result.pagination,
			});
		} catch (error: any) {
			res.status(500).json({ success: false, message: error.message });
		}
	}
	static async delete(req: Request, res: Response): Promise<void> {
		try {
			const { id } = req.params; // Ambil ID transaksi dari URL
			const userId = (req as any).user.id;

			await TransactionService.deleteTransaction(id, userId);
			res.status(200).json({ success: true, message: "Transaksi berhasil dihapus dan saldo telah disesuaikan" });
		} catch (error: any) {
			res.status(400).json({ success: false, message: error.message });
		}
	}
	static async update(req: Request, res: Response): Promise<void> {
		try {
			const { id } = req.params;
			const userId = (req as any).user.id;
			const { amount, note, date, categoryId } = req.body;

			const updatedTrx = await TransactionService.updateTransaction(id, userId, {
				amount,
				note,
				date,
				categoryId,
			});

			res.status(200).json({
				success: true,
				message: "Transaksi berhasil diperbarui dan saldo disesuaikan",
				data: updatedTrx,
			});
		} catch (error: any) {
			res.status(400).json({ success: false, message: error.message });
		}
	}
}
