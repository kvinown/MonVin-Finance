import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc, addDoc, limit } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Sparkles, ArrowUpRight, ArrowDownLeft, Wallet as WalletIcon, Calendar, Layers } from "lucide-react";

interface WalletItem {
	id: string;
	name: string;
	type: string;
	balance: number;
}

interface DashboardData {
	summary: {
		totalBalance: number;
		totalIncome: number;
		totalExpense: number;
	};
	walletsList: WalletItem[];
	recentTransactions: any[];
}

export const DashboardPage: React.FC = () => {
	const { user } = useAuth();
	const { showToast } = useToast();
	const [data, setData] = useState<DashboardData | null>(null);
	const [insight, setInsight] = useState<string>("");
	const [tokenInfo, setTokenInfo] = useState<{ used: number; max: number }>({ used: 0, max: 5 });

	const [loadingData, setLoadingData] = useState<boolean>(true);
	const [loadingInsight, setLoadingInsight] = useState<boolean>(false);
	const [errorMsg, setErrorMsg] = useState<string>("");

	const formatIDR = (num: number) => {
		return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
	};

	const fetchDashboard = async () => {
		if (!user) return;
		try {
			// 1. Ambil Semua Dompet Pengguna
			const walletsRef = collection(db, "wallets");
			const qWallets = query(walletsRef, where("userId", "==", user.id));
			const walletSnap = await getDocs(qWallets);

			let totalBalance = 0;
			const walletsList: WalletItem[] = [];

			walletSnap.forEach((doc) => {
				const w = { id: doc.id, ...doc.data() } as WalletItem;
				totalBalance += w.balance || 0;
				walletsList.push(w);
			});
			walletsList.sort((a, b) => a.name.localeCompare(b.name));

			// 2. Ambil Riwayat Transaksi Bulan Ini
			const now = new Date();
			const startOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

			const trxRef = collection(db, "transactions");
			const qTrx = query(trxRef, where("userId", "==", user.id), orderBy("date", "desc"));
			const trxSnap = await getDocs(qTrx);

			let totalIncome = 0;
			let totalExpense = 0;
			const allTrx: any[] = [];

			trxSnap.forEach((doc) => {
				const t = { id: doc.id, ...doc.data() } as any;
				allTrx.push(t);

				if (t.date >= startOfMonthStr) {
					if (t.category?.type === "INCOME") totalIncome += t.amount;
					if (t.category?.type === "EXPENSE") totalExpense += t.amount;
				}
			});

			// 3. Ambil Sesi Limit Token AI Pengguna Saat Ini dari Database
			const userDocRef = doc(db, "users", user.id);
			const userDocSnap = await getDoc(userDocRef);
			let currentUsedTokens = 0;
			const currentMonthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

			if (userDocSnap.exists()) {
				const uData = userDocSnap.data();
				// Validasi pergantian bulan logika reset kuota token
				if (uData.aiResetMonth === currentMonthId) {
					currentUsedTokens = uData.aiInsightCount || 0;
				} else {
					// Jika bulan baru, reset secara berkala di database saat diakses
					await updateDoc(userDocRef, {
						aiInsightCount: 0,
						aiResetMonth: currentMonthId,
					});
				}
			}
			setTokenInfo({ used: currentUsedTokens, max: 5 });

			// 4. Tarik Insight Terakhir yang Pernah Disimpan (Agar tidak hilang saat refresh)
			const insightsRef = collection(db, "insights");
			const qInsights = query(insightsRef, where("userId", "==", user.id), orderBy("createdAt", "desc"), limit(1));
			const insightSnap = await getDocs(qInsights);

			if (!insightSnap.empty) {
				setInsight(insightSnap.docs[0].data().content || "");
			}

			setData({
				summary: { totalBalance, totalIncome, totalExpense },
				walletsList,
				recentTransactions: allTrx.slice(0, 5),
			});
		} catch (err: any) {
			console.error("Dashboard Fetch Error:", err);
			setErrorMsg("Gagal sinkronisasi komputasi dasbor dari database.");
		} finally {
			setLoadingData(false);
		}
	};

	useEffect(() => {
		fetchDashboard();
	}, [user]);

	const handleFetchInsight = async () => {
		if (!data || !user) return;

		// Validasi Ketersediaan Token Akun Sebelum Mengirim Request ke Gemini
		const now = new Date();
		const currentMonthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

		setLoadingInsight(true);
		try {
			const userDocRef = doc(db, "users", user.id);
			const userDocSnap = await getDoc(userDocRef);
			let activeTokensUsed = 0;

			if (userDocSnap.exists()) {
				const uData = userDocSnap.data();
				if (uData.aiResetMonth === currentMonthId) {
					activeTokensUsed = uData.aiInsightCount || 0;
				}
			}

			if (activeTokensUsed >= 5) {
				showToast("Kuota pembuatan saran AI Anda bulan ini telah habis (Maksimal 5 kali). Sisa kuota akan pulih otomatis di bulan baru.", "error");
				setLoadingInsight(false);
				return;
			}

			const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
			const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

			const isProfileComplete = Boolean(user.age && user.status && user.field && user.location);
			let prompt = "";

			if (isProfileComplete) {
				prompt = `Berperanlah sebagai penasihat keuangan taktis. Klien Anda adalah seorang ${user.status} di bidang/jurusan ${user.field} berusia ${user.age} tahun yang berdomisili di ${user.location}. 
                Data bulan ini: Pemasukan Rp${data.summary.totalIncome}, Pengeluaran Rp${data.summary.totalExpense}, Sisa Saldo Total Rp${data.summary.totalBalance}.
                Berikan maksimal 3 kalimat saran restrukturisasi anggaran yang tajam, relevan dengan gaya hidup profesi di area tersebut, dan langsung pada intinya.`;
			} else {
				prompt = `Berperanlah sebagai penasihat keuangan makro. 
                Data bulan ini: Pemasukan Rp${data.summary.totalIncome}, Pengeluaran Rp${data.summary.totalExpense}, Sisa Saldo Total Rp${data.summary.totalBalance}.
                Berikan maksimal 3 kalimat saran restrukturisasi kas anggaran secara umum, taktis, dan mudah dipahami tanpa data demografi.`;
			}

			const response = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
			});

			const aiData = await response.json();
			if (aiData.candidates && aiData.candidates.length > 0) {
				const textResult = aiData.candidates[0].content.parts[0].text;

				// A. Simpan Log Rekam Insight Baru ke Koleksi 'insights' Firestore
				await addDoc(collection(db, "insights"), {
					userId: user.id,
					content: textResult,
					createdAt: new Date().toISOString(),
					balancesSnapshot: {
						income: data.summary.totalIncome,
						expense: data.summary.totalExpense,
						balance: data.summary.totalBalance,
					},
				});

				// B. Kurangi Token (Naikkan counter pemakaian di database)
				const updatedTokenCount = activeTokensUsed + 1;
				await updateDoc(userDocRef, {
					aiInsightCount: updatedTokenCount,
					aiResetMonth: currentMonthId,
				});

				// C. Perbarui State Tampilan Lokal
				setInsight(textResult);
				setTokenInfo({ used: updatedTokenCount, max: 5 });
				showToast("Saran AI baru berhasil diterbitkan dan disimpan!", "success");
			} else {
				throw new Error("Gagal mengolah teks respons.");
			}
		} catch (err: any) {
			console.error("AI Insight Error:", err);
			showToast("Gagal memanggil modul kecerdasan buatan. Silakan coba lagi nanti.", "error");
		} finally {
			setLoadingInsight(false);
		}
	};

	if (loadingData) {
		return (
			<div className="h-full w-full flex items-center justify-center">
				<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 dark:border-slate-100"></div>
			</div>
		);
	}

	return (
		<div className="space-y-8 max-w-7xl mx-auto animate-fadeIn">
			{errorMsg && <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">{errorMsg}</div>}

			{/* Rangkaian Card Tiga Metrik Ringkasan Kas Utama */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5 transition-colors duration-300">
					<div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
						<WalletIcon size={24} />
					</div>
					<div>
						<p className="text-xs font-bold tracking-wider uppercase text-slate-400">Total Kombinasi Aset</p>
						<h3 className="text-2xl font-bold font-display mt-1 text-slate-900 dark:text-slate-100">{formatIDR(data?.summary.totalBalance || 0)}</h3>
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5 transition-colors duration-300">
					<div className="p-3 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-xl">
						<ArrowUpRight size={24} />
					</div>
					<div>
						<p className="text-xs font-bold tracking-wider uppercase text-slate-400">Pemasukan Bulan Ini</p>
						<h3 className="text-2xl font-bold font-display mt-1 text-green-600 dark:text-green-400">{formatIDR(data?.summary.totalIncome || 0)}</h3>
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5 transition-colors duration-300">
					<div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl">
						<ArrowDownLeft size={24} />
					</div>
					<div>
						<p className="text-xs font-bold tracking-wider uppercase text-slate-400">Pengeluaran Bulan Ini</p>
						<h3 className="text-2xl font-bold font-display mt-1 text-red-600 dark:text-red-400">{formatIDR(data?.summary.totalExpense || 0)}</h3>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
				{/* PANEL KIRI-TENGAH: MODUL AI INSIGHT */}
				<div className="lg:col-span-2 space-y-6">
					<div className="p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors duration-300">
						<div className="absolute top-0 right-0 p-8 text-slate-200 dark:text-slate-800/40 pointer-events-none">
							<Sparkles size={120} />
						</div>
						<div className="max-w-2xl space-y-4 relative z-10">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-bold tracking-widest uppercase">
									<Sparkles size={16} /> Modul Komputasi Gemini AI
								</div>
								<span className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full font-semibold text-slate-500">
									Token Bulan Ini: {tokenInfo.max - tokenInfo.used} / {tokenInfo.max} Tersisa
								</span>
							</div>

							<h2 className="text-xl font-display font-medium tracking-wide">Optimasi Efisiensi Finansial Bulanan</h2>

							{!(user?.age && user?.status && user?.field && user?.location) && (
								<div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-lg">
									⚠️ Saran saat ini bersifat makro/umum. Lengkapi profil personal Anda di halaman Pengaturan Akun untuk membuka analisis presisi tinggi yang disesuaikan dengan kondisi riil finansial Anda.
								</div>
							)}

							{insight ? (
								<div className="space-y-2 animate-fadeIn">
									<p className="text-slate-700 dark:text-slate-300 text-sm tracking-wide leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 whitespace-pre-line">{insight}</p>
								</div>
							) : (
								<p className="text-slate-500 dark:text-slate-400 text-sm tracking-wide">Tekan tombol pemicu di bawah untuk mengevaluasi rasio pembagian anggaran bulanan Anda berdasarkan grafik mutasi dompet saat ini.</p>
							)}

							<button
								onClick={handleFetchInsight}
								disabled={loadingInsight || !data || tokenInfo.used >= tokenInfo.max}
								className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-semibold text-xs tracking-wider uppercase rounded-lg transition-all flex items-center gap-2 shadow-sm active:scale-95">
								{loadingInsight ? (
									<>
										<div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
										Memproses Struktur...
									</>
								) : tokenInfo.used >= tokenInfo.max ? (
									"Kuota Bulan Ini Habis"
								) : (
									"Minta Rekomendasi Baru"
								)}
							</button>
						</div>
					</div>
				</div>

				{/* PANEL KANAN: SPESIFIK OVERVIEW DAFTAR WALLET (FITUR TAMBAHAN BARU) */}
				<div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-5 space-y-4 transition-colors duration-300">
					<div className="flex items-center gap-2 text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
						<Layers size={16} />
						<h3 className="font-bold text-sm tracking-wider uppercase text-slate-900 dark:text-slate-100">Komposisi Alokasi Dompet</h3>
					</div>

					<div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
						{data?.walletsList && data.walletsList.length > 0 ? (
							data.walletsList.map((wallet) => (
								<div
									key={wallet.id}
									className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
									<div className="flex items-center gap-3 min-w-0">
										<div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-lg">
											<WalletIcon size={14} />
										</div>
										<div className="min-w-0">
											<p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{wallet.name}</p>
											<p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">{wallet.type}</p>
										</div>
									</div>
									<span className="text-sm font-semibold font-display text-slate-900 dark:text-slate-100 shrink-0 ml-2">{formatIDR(wallet.balance)}</span>
								</div>
							))
						) : (
							<p className="text-xs text-slate-400 italic text-center py-4">Belum ada aset terdaftar.</p>
						)}
					</div>

					<div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-slate-400">
						<span>Kombinasi ({data?.walletsList.length || 0} Akun)</span>
						<span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-display">{formatIDR(data?.summary.totalBalance || 0)}</span>
					</div>
				</div>
			</div>

			{/* TABEL AKTIVITAS TRANSAKSI TERAKHIR */}
			<div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
				<div className="p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
					<h3 className="font-bold tracking-wide text-slate-900 dark:text-slate-100">Aktivitas Transaksi Terakhir</h3>
					<span className="text-xs text-slate-500 flex items-center gap-1.5">
						<Calendar size={14} /> 5 Aktivitas Terbaru
					</span>
				</div>

				{/* VIEW DESKTOP */}
				<div className="hidden md:block overflow-x-auto">
					<table className="w-full text-left border-collapse text-sm">
						<thead>
							<tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
								<th className="p-4">Tanggal</th>
								<th className="p-4">Deskripsi/Catatan</th>
								<th className="p-4">Kategori</th>
								<th className="p-4">Dompet</th>
								<th className="p-4 text-right">Nominal</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
							{data?.recentTransactions && data.recentTransactions.length > 0 ? (
								data.recentTransactions.map((trx) => (
									<tr
										key={trx.id}
										className="hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-colors text-slate-700 dark:text-slate-300">
										<td className="p-4 text-slate-500">{new Date(trx.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
										<td className="p-4 font-medium tracking-wide truncate max-w-xs">{trx.note || "-"}</td>
										<td className="p-4">
											<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 rounded font-medium">
												{trx.category?.type === "INCOME" ? (
													<ArrowUpRight
														size={12}
														className="text-green-500"
													/>
												) : (
													<ArrowDownLeft
														size={12}
														className="text-red-500"
													/>
												)}
												{trx.category?.name || "Lainnya"}
											</span>
										</td>
										<td className="p-4 text-slate-500">{trx.wallet?.name || "Kas"}</td>
										<td className={`p-4 text-right font-semibold ${trx.category?.type === "INCOME" ? "text-green-600 dark:text-green-400" : "text-slate-900 dark:text-slate-100"}`}>
											{trx.category?.type === "INCOME" ? "+" : "-"}
											{formatIDR(trx.amount)}
										</td>
									</tr>
								))
							) : (
								<tr>
									<td
										colSpan={5}
										className="p-8 text-center text-slate-400 tracking-wide">
										Belum ada aktivitas rekam transaksi.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* VIEW MOBILE */}
				<div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
					{data?.recentTransactions && data.recentTransactions.length > 0 ? (
						data.recentTransactions.map((trx) => (
							<div
								key={trx.id}
								className="p-5 flex flex-col gap-3 hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-colors">
								<div className="flex justify-between items-start gap-4">
									<span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-semibold shrink-0">
										{trx.category?.type === "INCOME" ? (
											<ArrowUpRight
												size={14}
												className="text-green-500"
											/>
										) : (
											<ArrowDownLeft
												size={14}
												className="text-red-500"
											/>
										)}
										{trx.category?.name || "Lainnya"}
									</span>
									<span className={`font-bold text-base whitespace-nowrap ${trx.category?.type === "INCOME" ? "text-green-600 dark:text-green-400" : "text-slate-900 dark:text-slate-100"}`}>
										{trx.category?.type === "INCOME" ? "+" : "-"}
										{formatIDR(trx.amount)}
									</span>
								</div>
								<p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{trx.note || <span className="text-slate-400 italic">Tanpa catatan</span>}</p>
								<div className="flex justify-between items-center text-xs font-medium text-slate-500 dark:text-slate-400">
									<div className="flex items-center gap-1.5">
										<WalletIcon size={14} /> {trx.wallet?.name || "Kas"}
									</div>
									<span>{new Date(trx.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
								</div>
							</div>
						))
					) : (
						<div className="p-8 text-center text-slate-400 tracking-wide text-sm">Belum ada aktivitas rekam transaksi.</div>
					)}
				</div>
			</div>
		</div>
	);
};
