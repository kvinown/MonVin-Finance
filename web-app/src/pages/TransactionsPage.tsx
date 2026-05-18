import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useToast } from "../contexts/ToastContext";
import { Modal } from "../components/Modal";
import { Plus, Sparkles, ChevronLeft, ChevronRight, Filter, ArrowUpRight, ArrowDownLeft, Trash2 } from "lucide-react";
import { CurrencyInput } from "../components/CurrencyInput";

interface Transaction {
	id: string;
	amount: number;
	note: string;
	date: string;
	wallet: { name: string };
	category: { name: string; type: "INCOME" | "EXPENSE" };
}

interface Wallet {
	id: string;
	name: string;
	balance: number;
}
interface Category {
	id: string;
	name: string;
	type: "INCOME" | "EXPENSE";
}

export const TransactionsPage: React.FC = () => {
	const { showToast } = useToast();

	const formatIDRInput = (num: number) => {
		return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	};

	const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		// Regex \D akan membuang semua karakter yang bukan angka
		const rawValue = e.target.value.replace(/\D/g, "");
		setFormData({ ...formData, amount: Number(rawValue) });
	};

	// Data States
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [wallets, setWallets] = useState<Wallet[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);

	// Filter & Pagination States
	const [page, setPage] = useState(1);
	const [limit] = useState(10);
	const [typeFilter, setTypeFilter] = useState<string>("");
	const [totalPages, setTotalPages] = useState(1);
	const [isLoading, setIsLoading] = useState(true);

	// Modal Control States
	const [isManualModalOpen, setIsManualModalOpen] = useState(false);
	const [isAiModalOpen, setIsAiModalOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Form Manual States
	const [formData, setFormData] = useState({
		amount: 0,
		note: "",
		date: new Date().toISOString().split("T")[0],
		walletId: "",
		categoryId: "",
	});

	// Form On-The-Fly Category States
	const [newCategoryName, setNewCategoryName] = useState("");
	const [newCategoryType, setNewCategoryType] = useState<"INCOME" | "EXPENSE">("EXPENSE");

	// Form AI States
	const [aiText, setAiText] = useState("");
	const [aiLoading, setAiLoading] = useState(false);

	const formatIDR = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);

	// 1. Ambil Riwayat Transaksi dengan Pagination & Filter
	const fetchTransactions = async () => {
		setIsLoading(true);
		try {
			const res = await API.get(`/transactions?page=${page}&limit=${limit}&type=${typeFilter}`);
			setTransactions(res.data.data);
			setTotalPages(res.data.pagination.totalPages);
		} catch (err: any) {
			showToast(err.message || "Gagal memuat transaksi.", "error");
		} finally {
			setIsLoading(false);
		}
	};

	// 2. Ambil Dependensi untuk Dropdown (Wallet & Kategori)
	const fetchDependencies = async () => {
		try {
			const [walletRes, categoryRes] = await Promise.all([API.get("/wallets"), API.get("/categories")]);
			setWallets(walletRes.data.data);
			setCategories(categoryRes.data.data || []);
		} catch (err) {
			console.error("Gagal memuat data relasi dropdown.");
		}
	};

	useEffect(() => {
		fetchTransactions();
	}, [page, typeFilter]);

	useEffect(() => {
		fetchDependencies();
	}, []);

	// --- Handlers ---
	const handleManualSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (formData.amount <= 0 || !formData.walletId || !formData.categoryId) {
			return showToast("Mohon lengkapi parameter nominal, dompet, dan kategori.", "info");
		}

		if (formData.categoryId === "NEW" && !newCategoryName.trim()) {
			return showToast("Nama kategori baru tidak boleh kosong.", "info");
		}

		setIsSubmitting(true);
		try {
			let finalCategoryId = formData.categoryId;

			// Alur On-The-Fly: Buat Kategori Baru jika user memilih opsi "NEW"
			if (finalCategoryId === "NEW") {
				const catRes = await API.post("/categories", {
					name: newCategoryName,
					type: newCategoryType,
				});
				// Sesuai dengan respons backend bawaanmu (catRes.data.data)
				finalCategoryId = catRes.data.data.id;
			}

			// Lanjutkan simpan transaksi
			await API.post("/transactions", {
				...formData,
				categoryId: finalCategoryId,
			});

			showToast("Transaksi berhasil dicatat!", "success");

			// Reset State
			setIsManualModalOpen(false);
			setFormData({ amount: 0, note: "", date: new Date().toISOString().split("T")[0], walletId: "", categoryId: "" });
			setNewCategoryName("");
			setPage(1);

			fetchTransactions();
			fetchDependencies(); // Refresh list kategori di dropdown
		} catch (err: any) {
			showToast(err.message || "Gagal menyimpan transaksi.", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleAiParseSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!aiText.trim()) return showToast("Teks catatan tidak boleh kosong.", "info");

		setAiLoading(true);
		try {
			const res = await API.post("/gemini/parse", { text: aiText });
			const suggestion = res.data.suggestion;

			setFormData({
				amount: suggestion.amount || 0,
				note: suggestion.note || aiText,
				date: new Date().toISOString().split("T")[0],
				walletId: suggestion.walletId || wallets[0]?.id || "",
				categoryId: suggestion.categoryId || categories[0]?.id || "",
			});

			showToast("Gemini AI berhasil menstrukturkan data catatan Anda!", "success");
			setIsAiModalOpen(false);
			setIsManualModalOpen(true);
			setAiText("");
		} catch (err: any) {
			showToast(err.message || "Kecerdasan AI gagal mengekstrak teks. Mohon gunakan input manual.", "error");
		} finally {
			setAiLoading(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (!window.confirm("Apakah Anda yakin ingin menghapus transaksi ini? Saldo dompet akan di-rollback otomatis.")) return;
		try {
			await API.delete(`/transactions/${id}`);
			showToast("Transaksi dihapus dan saldo telah dipulihkan.", "success");
			fetchTransactions();
		} catch (err: any) {
			showToast(err.message || "Gagal menghapus transaksi.", "error");
		}
	};

	return (
		<div className="max-w-6xl mx-auto space-y-6">
			{/* Header Kontrol Halaman */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
				<div>
					<h2 className="text-xl font-bold font-display tracking-wide">Arsip Arus Kas</h2>
					<p className="text-sm text-slate-500 mt-1">Audit, saring, dan rekam seluruh log sirkulasi uang Anda.</p>
				</div>
				<div className="flex gap-3 w-full sm:w-auto">
					<button
						onClick={() => setIsAiModalOpen(true)}
						className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 font-semibold text-sm rounded-lg transition-all active:scale-95 shadow-sm">
						<Sparkles
							size={16}
							className="text-blue-500"
						/>{" "}
						Catat Pakai AI
					</button>
					<button
						onClick={() => setIsManualModalOpen(true)}
						className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors">
						<Plus size={16} /> Input Manual
					</button>
				</div>
			</div>

			{/* Kontrol Baris Penyaringan (Filter) */}
			<div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
				<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
					<Filter size={14} /> Klasifikasi:
				</div>
				<div className="flex gap-2">
					<button
						onClick={() => {
							setTypeFilter("");
							setPage(1);
						}}
						className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${!typeFilter ? "bg-slate-200 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"}`}>
						Semua
					</button>
					<button
						onClick={() => {
							setTypeFilter("INCOME");
							setPage(1);
						}}
						className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${typeFilter === "INCOME" ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 font-bold" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"}`}>
						Pemasukan
					</button>
					<button
						onClick={() => {
							setTypeFilter("EXPENSE");
							setPage(1);
						}}
						className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${typeFilter === "EXPENSE" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 font-bold" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"}`}>
						Pengeluaran
					</button>
				</div>
			</div>

			{/* Render Data Tabel Riwayat Konten */}
			<div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse text-sm">
						<thead>
							<tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
								<th className="p-4">Tanggal</th>
								<th className="p-4">Catatan/Keterangan</th>
								<th className="p-4">Kategori</th>
								<th className="p-4">Media Dompet</th>
								<th className="p-4 text-right">Nominal</th>
								<th className="p-4 text-center">Aksi</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
							{isLoading ? (
								<tr>
									<td
										colSpan={6}
										className="p-8 text-center">
										<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900 dark:border-slate-100 mx-auto"></div>
									</td>
								</tr>
							) : transactions.length > 0 ? (
								transactions.map((trx) => (
									<tr
										key={trx.id}
										className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
										<td className="p-4 text-slate-500 whitespace-nowrap">{new Date(trx.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
										<td className="p-4 font-medium tracking-wide max-w-xs truncate">{trx.note || "-"}</td>
										<td className="p-4 whitespace-nowrap">
											<span
												className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded ${trx.category.type === "INCOME" ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
												{trx.category.type === "INCOME" ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
												{trx.category.name}
											</span>
										</td>
										<td className="p-4 text-slate-500 whitespace-nowrap">{trx.wallet.name}</td>
										<td className={`p-4 text-right font-semibold whitespace-nowrap ${trx.category.type === "INCOME" ? "text-green-600 dark:text-green-400" : "text-slate-900 dark:text-slate-100"}`}>
											{trx.category.type === "INCOME" ? "+" : "-"}
											{formatIDR(trx.amount)}
										</td>
										<td className="p-4 text-center">
											<button
												onClick={() => handleDelete(trx.id)}
												className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
												title="Hapus Log">
												<Trash2 size={15} />
											</button>
										</td>
									</tr>
								))
							) : (
								<tr>
									<td
										colSpan={6}
										className="p-8 text-center text-slate-400 tracking-wide">
										Belum ada riwayat pencatatan transaksi yang terekam.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* Baris Navigasi Pagination */}
				{totalPages > 1 && (
					<div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
						<div className="text-xs font-medium text-slate-500 dark:text-slate-400">
							Halaman {page} dari {totalPages}
						</div>
						<div className="flex gap-2">
							<button
								onClick={() => setPage((p) => Math.max(p - 1, 1))}
								disabled={page === 1}
								className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-40 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
								<ChevronLeft size={16} />
							</button>
							<button
								onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
								disabled={page === totalPages}
								className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-40 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
								<ChevronRight size={16} />
							</button>
						</div>
					</div>
				)}
			</div>

			{/* MODAL 1: Catat Berbasis AI Text */}
			<Modal
				isOpen={isAiModalOpen}
				onClose={() => setIsAiModalOpen(false)}
				title="Komputasi AI Parser Teks Gemini">
				<form
					onSubmit={handleAiParseSubmit}
					className="space-y-4">
					<div>
						<label className="label-base">Ketik Catatan Keuangan Bebas</label>
						<textarea
							required
							rows={3}
							placeholder="Contoh: beli seblak kuah 15000 dari dompet tunai atau gajian masuk 3juta ke rekening bca"
							className="input-base resize-none py-2.5 leading-relaxed"
							value={aiText}
							onChange={(e) => setAiText(e.target.value)}
							disabled={aiLoading}
						/>
					</div>
					<div className="pt-2">
						<button
							type="submit"
							disabled={aiLoading || !aiText.trim()}
							className="btn-slate-primary flex items-center justify-center gap-2 h-10 w-full">
							{aiLoading ? <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : "Strukturkan via Gemini AI"}
						</button>
					</div>
				</form>
			</Modal>

			{/* MODAL 2: Form Review Manual / Tambah Manual */}
			<Modal
				isOpen={isManualModalOpen}
				onClose={() => setIsManualModalOpen(false)}
				title="Formulir Rekam Transaksi">
				<form
					onSubmit={handleManualSubmit}
					className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="label-base">Pilih Dompet Media</label>
							<select
								required
								className="input-base"
								value={formData.walletId}
								onChange={(e) => setFormData({ ...formData, walletId: e.target.value })}
								disabled={isSubmitting}>
								<option value="">Pilih...</option>
								{wallets.map((w) => (
									<option
										key={w.id}
										value={w.id}>
										{w.name}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="label-base">Komponen Kategori</label>
							<select
								required
								className="input-base"
								value={formData.categoryId}
								onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
								disabled={isSubmitting}>
								<option value="">Pilih...</option>
								{categories.map((c) => (
									<option
										key={c.id}
										value={c.id}>
										[{c.type}] {c.name}
									</option>
								))}
								<option
									value="NEW"
									className="font-bold text-blue-600 dark:text-blue-400">
									+ Buat Kategori Baru
								</option>
							</select>
						</div>
					</div>

					{/* Muncul Dinamis Jika Memilih "+ Buat Kategori Baru" */}
					{formData.categoryId === "NEW" && (
						<div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 animate-fadeIn">
							<div>
								<label className="label-base">Nama Kategori Baru</label>
								<input
									type="text"
									required
									placeholder="Mis: Uang Saku, Makanan Ringan"
									className="input-base"
									value={newCategoryName}
									onChange={(e) => setNewCategoryName(e.target.value)}
									disabled={isSubmitting}
								/>
							</div>
							<div>
								<label className="label-base">Tipe Arus Kas</label>
								<div className="flex gap-4 mt-1">
									<label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700 dark:text-slate-300">
										<input
											type="radio"
											name="catType"
											checked={newCategoryType === "EXPENSE"}
											onChange={() => setNewCategoryType("EXPENSE")}
											className="accent-blue-600"
										/>
										Pengeluaran
									</label>
									<label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700 dark:text-slate-300">
										<input
											type="radio"
											name="catType"
											checked={newCategoryType === "INCOME"}
											onChange={() => setNewCategoryType("INCOME")}
											className="accent-blue-600"
										/>
										Pemasukan
									</label>
								</div>
							</div>
						</div>
					)}

					<CurrencyInput
						label="Nominal Transaksi"
						required
						value={formData.amount}
						onChange={(val) => setFormData({ ...formData, amount: val })}
						disabled={isSubmitting}
					/>
					<div>
						<label className="label-base">Deskripsi Catatan Pendek</label>
						<input
							type="text"
							placeholder="Keterangan tambahan..."
							className="input-base"
							value={formData.note}
							onChange={(e) => setFormData({ ...formData, note: e.target.value })}
							disabled={isSubmitting}
						/>
					</div>
					<div>
						<label className="label-base">Tanggal Transaksi</label>
						<input
							type="date"
							required
							className="input-base"
							value={formData.date}
							onChange={(e) => setFormData({ ...formData, date: e.target.value })}
							disabled={isSubmitting}
						/>
					</div>
					<div className="pt-2">
						<button
							type="submit"
							className="btn-slate-primary h-10 flex items-center justify-center w-full"
							disabled={isSubmitting}>
							{isSubmitting ? <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : "Simpan Transaksi"}
						</button>
					</div>
				</form>
			</Modal>
		</div>
	);
};
