import prisma from "../../config/db";
import { WalletType } from "@prisma/client";

export class WalletService {
	// 1. Membuat Dompet Baru
	static async createWallet(userId: string, name: string, type: WalletType, balance: number = 0) {
		// Validasi tambahan jika saldo awal minus
		if (balance < 0) throw new Error("Saldo awal tidak boleh negatif");

		return await prisma.wallet.create({
			data: {
				name,
				type,
				balance,
				userId,
			},
		});
	}

	// 2. Mengambil Semua Dompet Milik User Tertentu
	static async getWalletsByUser(userId: string) {
		return await prisma.wallet.findMany({
			where: {
				userId,
				isActive: true, // 🔥 Hanya ambil dompet yang belum dihapus
			},
			orderBy: { createdAt: "desc" },
		});
	}

	static async deleteWallet(walletId: string, userId: string) {
		// Cek kepemilikan dompet
		const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
		if (!wallet) throw new Error("Dompet tidak ditemukan");
		if (wallet.userId !== userId) throw new Error("Akses ditolak");

		// Ubah flag menjadi false (Soft Delete)
		return await prisma.wallet.update({
			where: { id: walletId },
			data: { isActive: false },
		});
	}
	// FITUR TRANSFER ANTAR WALLET
	static async transferBalance(userId: string, sourceWalletId: string, destinationWalletId: string, amount: number) {
		if (amount <= 0) throw new Error("Nominal transfer harus lebih dari 0");
		if (sourceWalletId === destinationWalletId) throw new Error("Wallet asal dan tujuan tidak boleh sama");

		return await prisma.$transaction(async (tx) => {
			// A. Validasi dan ambil data wallet asal
			const sourceWallet = await tx.wallet.findUnique({ where: { id: sourceWalletId } });
			if (!sourceWallet || !sourceWallet.isActive || sourceWallet.userId !== userId) {
				throw new Error("Wallet asal tidak ditemukan atau tidak valid");
			}

			// B. Validasi dan ambil data wallet tujuan
			const destWallet = await tx.wallet.findUnique({ where: { id: destinationWalletId } });
			if (!destWallet || !destWallet.isActive || destWallet.userId !== userId) {
				throw new Error("Wallet tujuan tidak ditemukan atau tidak valid");
			}

			// C. Validasi kecukupan saldo wallet asal
			if (sourceWallet.balance < amount) {
				throw new Error(`Saldo tidak mencukupi. Sisa saldo ${sourceWallet.name}: Rp${sourceWallet.balance}`);
			}

			// D. Kurangi saldo wallet asal
			const updatedSource = await tx.wallet.update({
				where: { id: sourceWalletId },
				data: { balance: sourceWallet.balance - amount },
			});

			// E. Tambah saldo wallet tujuan
			const updatedDest = await tx.wallet.update({
				where: { id: destinationWalletId },
				data: { balance: destWallet.balance + amount },
			});

			return {
				sourceWallet: { id: updatedSource.id, name: updatedSource.name, currentBalance: updatedSource.balance },
				destinationWallet: { id: updatedDest.id, name: updatedDest.name, currentBalance: updatedDest.balance },
				amountTransferred: amount,
			};
		});
	}
}
