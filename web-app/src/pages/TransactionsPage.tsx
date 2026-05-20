import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, writeBatch, orderBy, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Modal } from "../components/Modal";
import { Plus, Trash2, ArrowUpRight, ArrowDownLeft, Filter, Wallet as WalletIcon, Sparkles } from "lucide-react";
import { CurrencyInput } from "../components/CurrencyInput";

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

interface Transaction {
	id: string;
	amount: number;
	note: string;
	date: string;
	walletId: string;
	wallet: { name: string };
	categoryId: string;
	category: { name: string; type: "INCOME" | "EXPENSE" };
}

export const TransactionsPage: React.FC = () => {
	const { user } = useAuth();
	const { showToast } = useToast();
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [wallets, setWallets] = useState<Wallet[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// Filter State
	const [filterType, setFilterType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");

	// Modal States
	const [isModalOpen, setIsModalOpen] = useState(false); // Modal Manual
	const [isAiModalOpen, setIsAiModalOpen] = useState(false); // Modal AI
	const [isAddingCategory, setIsAddingCategory] = useState(false);
	const [trxToDelete, setTrxToDelete] = useState<Transaction | null>(null);

	// Form States (Manual)
	const [formData, setFormData] = useState({ amount: 0, note: "", date: new Date().toISOString().split("T")[0], walletId: "", categoryId: "" });
	const [newCategoryName, setNewCategoryName] = useState("");
	const [newCategoryType, setNewCategoryType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Form States (AI)
	const [aiText, setAiText] = useState("");
	const [aiLoading, setAiLoading] = useState(false);

	const formatIDR = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);

	// 1. FETCH SEMUA DATA
	const fetchData = async () => {
		if (!user) return;
		try {
			// Fetch Wallets
			const wQuery = query(collection(db, "wallets"), where("userId", "==", user.id));
			const wSnap = await getDocs(wQuery);
			const wList = wSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Wallet);
			setWallets(wList);

			// Fetch Categories
			const cQuery = query(collection(db, "categories"), where("userId", "==", user.id));
			const cSnap = await getDocs(cQuery);
			const cList = cSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
			setCategories(cList);

			// Fetch Transactions
			const tQuery = query(collection(db, "transactions"), where("userId", "==", user.id), orderBy("date", "desc"));
			const tSnap = await getDocs(tQuery);
			const tList = tSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction);
			setTransactions(tList);
		} catch (err) {
			console.error(err);
			showToast("Gagal memuat data transaksi.", "error");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, [user]);

	// 2. FUNGSI AI GEMINI PARSER
	const handleAiParseSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!aiText.trim()) return showToast("Teks catatan tidak boleh kosong.", "info");

		setAiLoading(true);
		try {
			// Bersihkan API Key dari spasi atau tanda kutip yang tidak sengaja terbawa dari .env
			const rawKey = import.meta.env.VITE_GEMINI_API_KEY || "";
			const apiKey = rawKey.replace(/['"]/g, "").trim();

			const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

			const availableWallets = wallets.map((w) => ({ id: w.id, name: w.name }));
			const availableCategories = categories.map((c) => ({ id: c.id, name: c.name, type: c.type }));

			const prompt = `
            Bertindaklah sebagai pemroses data keuangan. Analisis teks berikut dan ekstrak menjadi format JSON.
            
            Teks masukan: "${aiText}"
            
            Daftar Dompet yang Valid: ${JSON.stringify(availableWallets)}
            Daftar Kategori yang Valid: ${JSON.stringify(availableCategories)}
            
            Aturan ekstraksi:
            1. "amount": Cari nominal angka dari teks.
            2. "note": Ringkasan catatan transaksi (maksimal 5 kata).
            3. "walletId": Cocokkan dengan id dari Daftar Dompet yang paling relevan. Jika tidak tahu, biarkan kosong "".
            4. "categoryId": Cocokkan dengan id dari Daftar Kategori yang paling relevan. Jika tidak tahu, biarkan kosong "".
            
            HANYA KEMBALIKAN OUTPUT BERUPA JSON MURNI TANPA MARKDOWN ATAU TEKS LAIN.
            Format wajib: {"amount": angka, "note": "string", "walletId": "string", "categoryId": "string"}
            `;

			const response = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
			});

			// Jika Google menolak (karena API Key salah, dsb), lempar pesan error aslinya
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(`Koneksi AI Gagal: ${errorData.error?.message || "Periksa kembali konfigurasi API Key."}`);
			}

			const aiData = await response.json();

			if (aiData.candidates && aiData.candidates.length > 0) {
				let rawJson = aiData.candidates[0].content.parts[0].text;
				rawJson = rawJson
					.replace(/```json/g, "")
					.replace(/```/g, "")
					.trim();

				const suggestion = JSON.parse(rawJson);

				setFormData({
					amount: suggestion.amount || 0,
					note: suggestion.note || aiText,
					date: new Date().toISOString().split("T")[0],
					walletId: suggestion.walletId || wallets[0]?.id || "",
					categoryId: suggestion.categoryId || categories[0]?.id || "",
				});

				const catType = categories.find((c) => c.id === suggestion.categoryId)?.type || "EXPENSE";
				setNewCategoryType(catType);

				showToast("Kecerdasan buatan berhasil menstrukturkan data Anda!", "success");
				setIsAiModalOpen(false);
				setIsModalOpen(true);
				setAiText("");
			} else {
				throw new Error("Format respons AI kosong atau tidak dikenali.");
			}
		} catch (err: any) {
			console.error("Gemini Error:", err);
			showToast(err.message || "Kecerdasan AI gagal memproses data.", "error");
		} finally {
			setAiLoading(false);
		}
	};
	// 3. FUNGSI TAMBAH KATEGORI BARU
	const handleAddCategory = async () => {
		if (!newCategoryName) return showToast("Nama kategori tidak boleh kosong", "error");
		setIsSubmitting(true);
		try {
			const docRef = await addDoc(collection(db, "categories"), {
				userId: user?.id,
				name: newCategoryName,
				type: newCategoryType,
				isActive: true,
				createdAt: new Date().toISOString(),
			});
			const newCat: Category = { id: docRef.id, name: newCategoryName, type: newCategoryType };
			setCategories([...categories, newCat]);
			setFormData({ ...formData, categoryId: newCat.id });
			setIsAddingCategory(false);
			setNewCategoryName("");
			showToast("Kategori baru berhasil ditambahkan", "success");
		} catch (err) {
			showToast("Gagal menambahkan kategori", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	// 4. FUNGSI SIMPAN TRANSAKSI
	const handleSubmitTransaction = async (e: React.FormEvent) => {
		e.preventDefault();
		if (formData.amount <= 0) return showToast("Nominal harus lebih dari 0", "error");
		if (!formData.walletId || !formData.categoryId) return showToast("Pilih dompet dan kategori", "error");

		const selectedWallet = wallets.find((w) => w.id === formData.walletId);
		const selectedCategory = categories.find((c) => c.id === formData.categoryId);

		if (!selectedWallet || !selectedCategory) return showToast("Data dompet/kategori tidak valid", "error");

		if (selectedCategory.type === "EXPENSE" && selectedWallet.balance < formData.amount) {
			return showToast("Saldo dompet tidak mencukupi untuk pengeluaran ini", "error");
		}

		setIsSubmitting(true);
		try {
			const batch = writeBatch(db);

			const newTrxRef = doc(collection(db, "transactions"));
			batch.set(newTrxRef, {
				userId: user?.id,
				amount: formData.amount,
				note: formData.note,
				date: formData.date,
				walletId: selectedWallet.id,
				wallet: { name: selectedWallet.name },
				categoryId: selectedCategory.id,
				category: { name: selectedCategory.name, type: selectedCategory.type },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});

			const walletRef = doc(db, "wallets", selectedWallet.id);
			const newBalance = selectedCategory.type === "INCOME" ? selectedWallet.balance + formData.amount : selectedWallet.balance - formData.amount;
			batch.update(walletRef, { balance: newBalance, updatedAt: new Date().toISOString() });

			await batch.commit();

			showToast("Transaksi berhasil dicatat", "success");
			setIsModalOpen(false);
			setFormData({ amount: 0, note: "", date: new Date().toISOString().split("T")[0], walletId: "", categoryId: "" });
			fetchData();
		} catch (err) {
			showToast("Gagal menyimpan transaksi", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	// 5. FUNGSI HAPUS TRANSAKSI
	const handleDeleteTransaction = async () => {
		if (!trxToDelete) return;
		setIsSubmitting(true);
		try {
			const wallet = wallets.find((w) => w.id === trxToDelete.walletId);
			if (!wallet) throw new Error("Dompet terkait tidak ditemukan");

			const batch = writeBatch(db);
			batch.delete(doc(db, "transactions", trxToDelete.id));

			const walletRef = doc(db, "wallets", wallet.id);
			const reversedBalance = trxToDelete.category.type === "INCOME" ? wallet.balance - trxToDelete.amount : wallet.balance + trxToDelete.amount;
			batch.update(walletRef, { balance: reversedBalance });

			await batch.commit();

			showToast("Transaksi dihapus dan saldo dikembalikan", "success");
			setTrxToDelete(null);
			fetchData();
		} catch (err: any) {
			showToast(err.message || "Gagal menghapus transaksi", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	const filteredTransactions = filterType === "ALL" ? transactions : transactions.filter((t) => t.category.type === filterType);
	const filteredCategoriesForm = categories.filter((c) => c.type === newCategoryType);

	if (isLoading) {
		return (
			<div className="h-full w-full flex items-center justify-center">
				<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 dark:border-slate-100"></div>
			</div>
		);
	}

	return (
		<div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
			{/* HEADER & FILTER */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold font-display tracking-wide text-slate-900 dark:text-slate-100">Riwayat Transaksi</h1>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Pantau arus kas masuk dan keluar Anda.</p>
				</div>
				<div className="flex flex-wrap gap-3 items-center">
					<div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
						{(["ALL", "INCOME", "EXPENSE"] as const).map((type) => (
							<button
								key={type}
								onClick={() => setFilterType(type)}
								className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${filterType === type ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
								{type === "ALL" ? "Semua" : type === "INCOME" ? "Pemasukan" : "Pengeluaran"}
							</button>
						))}
					</div>

					{/* Tombol Aksi */}
					<div className="flex gap-2">
						<button
							onClick={() => setIsAiModalOpen(true)}
							className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white font-semibold text-sm rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-500/20 active:scale-95">
							<Sparkles size={16} /> <span className="hidden sm:inline">AI Input</span>
						</button>
						<button
							onClick={() => setIsModalOpen(true)}
							className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20 active:scale-95">
							<Plus size={16} /> <span className="hidden sm:inline">Manual</span>
						</button>
					</div>
				</div>
			</div>

			{/* LIST TRANSAKSI */}
			<div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
				{filteredTransactions.length === 0 ? (
					<div className="p-12 text-center">
						<Filter
							size={48}
							className="mx-auto text-slate-300 dark:text-slate-700 mb-4"
						/>
						<h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Tidak Ada Data</h3>
						<p className="text-sm text-slate-500 mt-2">Belum ada catatan transaksi untuk filter ini.</p>
					</div>
				) : (
					<div className="divide-y divide-slate-100 dark:divide-slate-800/60">
						{filteredTransactions.map((trx) => (
							<div
								key={trx.id}
								className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-colors group">
								<div className="flex items-center gap-4">
									<div className={`p-3 rounded-xl shrink-0 ${trx.category.type === "INCOME" ? "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"}`}>
										{trx.category.type === "INCOME" ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
									</div>
									<div>
										<h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{trx.category.name}</h4>
										<p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{trx.note || <span className="italic">Tanpa catatan</span>}</p>
										<div className="flex items-center gap-3 mt-2 text-xs font-medium text-slate-400">
											<span className="flex items-center gap-1">
												<WalletIcon size={12} /> {trx.wallet.name}
											</span>
											<span>•</span>
											<span>{new Date(trx.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
										</div>
									</div>
								</div>
								<div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full">
									<span className={`font-bold text-lg font-display ${trx.category.type === "INCOME" ? "text-green-600 dark:text-green-400" : "text-slate-900 dark:text-slate-100"}`}>
										{trx.category.type === "INCOME" ? "+" : "-"} {formatIDR(trx.amount)}
									</span>
									<button
										onClick={() => setTrxToDelete(trx)}
										className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors sm:opacity-0 sm:group-hover:opacity-100">
										<Trash2 size={18} />
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* MODAL AI GEMINI */}
			<Modal
				isOpen={isAiModalOpen}
				onClose={() => setIsAiModalOpen(false)}
				title="Pencatatan Cerdas dengan AI">
				<form
					onSubmit={handleAiParseSubmit}
					className="space-y-4">
					<p className="text-sm text-slate-600 dark:text-slate-400">Ketik transaksi Anda dengan gaya bahasa natural. Gemini AI akan otomatis mengkategorikan, mengaitkan dompet, dan mencatat nominalnya.</p>
					<textarea
						rows={4}
						className="input-base resize-none"
						placeholder="Contoh: Beli nasi padang 20 ribu pakai gopay"
						value={aiText}
						onChange={(e) => setAiText(e.target.value)}
						disabled={aiLoading}
						autoFocus
					/>
					<div className="pt-2">
						<button
							type="submit"
							className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
							disabled={aiLoading || !aiText.trim()}>
							{aiLoading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Sparkles size={16} />}
							{aiLoading ? "Menganalisis..." : "Proses dengan AI"}
						</button>
					</div>
				</form>
			</Modal>

			{/* MODAL TAMBAH TRANSAKSI MANUAL */}
			<Modal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title="Detail Transaksi">
				<form
					onSubmit={handleSubmitTransaction}
					className="space-y-4">
					<div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-4">
						<button
							type="button"
							onClick={() => setNewCategoryType("EXPENSE")}
							className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${newCategoryType === "EXPENSE" ? "bg-white dark:bg-slate-700 text-red-600 shadow-sm" : "text-slate-500"}`}>
							Pengeluaran
						</button>
						<button
							type="button"
							onClick={() => setNewCategoryType("INCOME")}
							className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${newCategoryType === "INCOME" ? "bg-white dark:bg-slate-700 text-green-600 shadow-sm" : "text-slate-500"}`}>
							Pemasukan
						</button>
					</div>

					<CurrencyInput
						label="Nominal"
						required
						value={formData.amount}
						onChange={(val) => setFormData({ ...formData, amount: val })}
						disabled={isSubmitting}
					/>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="label-base">Dompet Sumber</label>
							<select
								required
								className="input-base"
								value={formData.walletId}
								onChange={(e) => setFormData({ ...formData, walletId: e.target.value })}
								disabled={isSubmitting}>
								<option
									value=""
									disabled>
									Pilih Dompet
								</option>
								{wallets.map((w) => (
									<option
										key={w.id}
										value={w.id}>
										{w.name} ({formatIDR(w.balance)})
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="label-base flex justify-between">
								<span>Kategori</span>
								{!isAddingCategory && (
									<button
										type="button"
										onClick={() => setIsAddingCategory(true)}
										className="text-blue-600 text-xs hover:underline">
										+ Baru
									</button>
								)}
							</label>
							{isAddingCategory ? (
								<div className="flex gap-2">
									<input
										type="text"
										placeholder="Nama..."
										className="input-base px-2"
										value={newCategoryName}
										onChange={(e) => setNewCategoryName(e.target.value)}
										autoFocus
									/>
									<button
										type="button"
										onClick={handleAddCategory}
										disabled={isSubmitting}
										className="bg-blue-600 text-white px-2 rounded-lg text-xs font-bold shrink-0">
										✔
									</button>
									<button
										type="button"
										onClick={() => setIsAddingCategory(false)}
										className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 rounded-lg text-xs font-bold shrink-0">
										X
									</button>
								</div>
							) : (
								<select
									required
									className="input-base"
									value={formData.categoryId}
									onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
									disabled={isSubmitting}>
									<option
										value=""
										disabled>
										Pilih Kategori
									</option>
									{filteredCategoriesForm.map((c) => (
										<option
											key={c.id}
											value={c.id}>
											{c.name}
										</option>
									))}
								</select>
							)}
						</div>
					</div>

					<div>
						<label className="label-base">Catatan (Opsional)</label>
						<input
							type="text"
							placeholder="Beli kopi, Gaji bulanan, dll..."
							className="input-base"
							value={formData.note}
							onChange={(e) => setFormData({ ...formData, note: e.target.value })}
							disabled={isSubmitting}
						/>
					</div>

					<div>
						<label className="label-base">Tanggal</label>
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
							className="btn-slate-primary h-10 w-full"
							disabled={isSubmitting}>
							{isSubmitting ? "Menyimpan..." : "Simpan Transaksi"}
						</button>
					</div>
				</form>
			</Modal>

			{/* MODAL HAPUS TRANSAKSI */}
			<Modal
				isOpen={!!trxToDelete}
				onClose={() => setTrxToDelete(null)}
				title="Hapus Transaksi">
				<div className="space-y-4">
					<p className="text-sm text-slate-600 dark:text-slate-300">
						Yakin ingin menghapus transaksi <strong>{trxToDelete?.category.name}</strong> sebesar {formatIDR(trxToDelete?.amount || 0)}? Saldo dompet akan disesuaikan kembali secara otomatis.
					</p>
					<div className="flex gap-3 pt-2">
						<button
							type="button"
							onClick={() => setTrxToDelete(null)}
							className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg"
							disabled={isSubmitting}>
							Batal
						</button>
						<button
							onClick={handleDeleteTransaction}
							className="flex-1 py-2 bg-red-600 text-white font-medium rounded-lg"
							disabled={isSubmitting}>
							{isSubmitting ? "Menghapus..." : "Hapus"}
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
};;
