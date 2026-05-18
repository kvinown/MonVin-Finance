import prisma from "../../config/db";
import { GeminiService } from "../gemini/gemini.service";
import { CategoryType } from "@prisma/client";

export class DashboardService {
	// 1. DASHBOARD MURNI (Sangat cepat, hemat resource)
	static async getSummaryData(userId: string) {
		const wallets = await prisma.wallet.findMany({ where: { userId } });
		const totalBalance = wallets.reduce((acc, curr) => acc + curr.balance, 0);

		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const currentMonthTransactions = await prisma.transaction.findMany({
			where: {
				userId,
				date: { gte: startOfMonth },
			},
			include: { category: true, wallet: true },
			orderBy: { date: "desc" },
		});

		let totalIncome = 0;
		let totalExpense = 0;

		currentMonthTransactions.forEach((t) => {
			if (t.category.type === CategoryType.INCOME) totalIncome += t.amount;
			if (t.category.type === CategoryType.EXPENSE) totalExpense += t.amount;
		});

		return {
			summary: {
				totalBalance,
				totalIncome,
				totalExpense,
			},
			recentTransactions: currentMonthTransactions.slice(0, 5),
		};
	}

	// 2. FITUR INSIGHT AI ON-DEMAND (Dipanggil hanya saat tombol ditekan)
	static async getAiInsight(userId: string) {
		// Ambil data rekapitulasi bulan ini
		const { summary } = await this.getSummaryData(userId);

		// Lempar angkanya ke Gemini
		const insight = await GeminiService.analyzeFinancialData(summary.totalIncome, summary.totalExpense, summary.totalBalance);

		return { insight };
	}
}
