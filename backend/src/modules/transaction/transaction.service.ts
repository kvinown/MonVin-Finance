import prisma from "../../config/db";

export class TransactionService {
	// 1. MENCATAT TRANSAKSI BARU
	static async createTransaction(data: { userId: string; walletId: string; categoryId: string; amount: number; note?: string; date?: string | Date }) {
		if (data.amount <= 0) throw new Error("Nominal transaksi harus lebih dari 0");

		return await prisma.$transaction(async (tx) => {
			// Validasi Wallet
			const wallet = await tx.wallet.findUnique({ where: { id: data.walletId } });
			if (!wallet || !wallet.isActive || wallet.userId !== data.userId) {
				throw new Error("Dompet tidak ditemukan atau tidak valid");
			}

			// Validasi Category
			const category = await tx.category.findUnique({ where: { id: data.categoryId } });
			if (!category || !category.isActive) {
				throw new Error("Kategori tidak ditemukan atau tidak valid");
			}

			// Kalkulasi Saldo Baru
			let newBalance = wallet.balance;

			if (category.type === "INCOME") {
				newBalance += data.amount;
			} else if (category.type === "EXPENSE") {
				if (wallet.balance < data.amount) {
					throw new Error(`Saldo tidak mencukupi. Sisa saldo: Rp${wallet.balance}`);
				}
				newBalance -= data.amount;
			}

			// Update Saldo Wallet
			await tx.wallet.update({
				where: { id: data.walletId },
				data: { balance: newBalance },
			});

			// Simpan Transaksi
			return await tx.transaction.create({
				data: {
					userId: data.userId,
					walletId: data.walletId,
					categoryId: data.categoryId,
					amount: data.amount,
					note: data.note || "",
					date: data.date ? new Date(data.date) : new Date(),
				},
				include: { wallet: true, category: true },
			});
		});
	}

	// 2. MENDAPATKAN RIWAYAT TRANSAKSI (DENGAN PAGINATION & FILTER)
	static async getTransactionsByUser(userId: string, page: number = 1, limit: number = 10, type?: string) {
		const skip = (page - 1) * limit;

		const whereCondition: any = {
			userId,
			wallet: { isActive: true },
		};

		if (type === "INCOME" || type === "EXPENSE") {
			whereCondition.category = { type };
		}

		const [data, totalItems] = await Promise.all([
			prisma.transaction.findMany({
				where: whereCondition,
				skip,
				take: limit,
				include: {
					wallet: { select: { name: true, type: true } },
					category: { select: { name: true, type: true } },
				},
				orderBy: { date: "desc" },
			}),
			prisma.transaction.count({ where: whereCondition }),
		]);

		return {
			data,
			pagination: {
				page,
				limit,
				totalItems,
				totalPages: Math.ceil(totalItems / limit) || 1,
			},
		};
	}

	// 3. MENGUPDATE TRANSAKSI & KALKULASI ULANG SALDO
	static async updateTransaction(transactionId: string, userId: string, updateData: { amount?: number; note?: string; date?: Date | string; categoryId?: string }) {
		return await prisma.$transaction(async (tx) => {
			const oldTrx = await tx.transaction.findUnique({
				where: { id: transactionId },
				include: { category: true, wallet: true },
			});

			if (!oldTrx) throw new Error("Transaksi tidak ditemukan");
			if (oldTrx.userId !== userId) throw new Error("Akses ditolak");

			let currentWalletBalance = oldTrx.wallet.balance;

			// Rollback saldo jika nominal atau kategori diubah
			if (updateData.amount !== undefined || updateData.categoryId !== undefined) {
				if (oldTrx.category.type === "INCOME") {
					currentWalletBalance -= oldTrx.amount;
				} else if (oldTrx.category.type === "EXPENSE") {
					currentWalletBalance += oldTrx.amount;
				}
			}

			// Tentukan kategori baru
			let finalCategory = oldTrx.category;
			if (updateData.categoryId && updateData.categoryId !== oldTrx.categoryId) {
				const newCat = await tx.category.findUnique({ where: { id: updateData.categoryId } });
				if (!newCat) throw new Error("Kategori baru tidak ditemukan");
				finalCategory = newCat;
			}

			// Hitung saldo final
			const finalAmount = updateData.amount !== undefined ? updateData.amount : oldTrx.amount;
			if (finalAmount <= 0) throw new Error("Nominal transaksi harus lebih dari 0");

			if (finalCategory.type === "INCOME") {
				currentWalletBalance += finalAmount;
			} else if (finalCategory.type === "EXPENSE") {
				if (currentWalletBalance < finalAmount) {
					throw new Error(`Saldo tidak mencukupi untuk pembaruan ini. Sisa: Rp${currentWalletBalance}`);
				}
				currentWalletBalance -= finalAmount;
			}

			// Eksekusi update dompet dan transaksi
			await tx.wallet.update({
				where: { id: oldTrx.walletId },
				data: { balance: currentWalletBalance },
			});

			return await tx.transaction.update({
				where: { id: transactionId },
				data: {
					amount: finalAmount,
					note: updateData.note !== undefined ? updateData.note : oldTrx.note,
					date: updateData.date ? new Date(updateData.date) : oldTrx.date,
					categoryId: finalCategory.id,
				},
				include: { wallet: true, category: true },
			});
		});
	}

	// 4. MENGHAPUS TRANSAKSI & ROLLBACK SALDO
	static async deleteTransaction(transactionId: string, userId: string) {
		return await prisma.$transaction(async (tx) => {
			const existingTrx = await tx.transaction.findUnique({
				where: { id: transactionId },
				include: { category: true, wallet: true },
			});

			if (!existingTrx) throw new Error("Transaksi tidak ditemukan");
			if (existingTrx.userId !== userId) throw new Error("Akses ditolak: Ini bukan transaksi Anda");

			let newBalance = existingTrx.wallet.balance;

			if (existingTrx.category.type === "INCOME") {
				newBalance -= existingTrx.amount; // Tarik kembali pemasukan
			} else if (existingTrx.category.type === "EXPENSE") {
				newBalance += existingTrx.amount; // Kembalikan pengeluaran
			}

			await tx.wallet.update({
				where: { id: existingTrx.walletId },
				data: { balance: newBalance },
			});

			return await tx.transaction.delete({
				where: { id: transactionId },
			});
		});
	}
}
