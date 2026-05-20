import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Modal } from "../components/Modal";
import { Plus, ArrowRightLeft, CreditCard, Wallet as WalletIcon, Trash2 } from "lucide-react";
import { CurrencyInput } from "../components/CurrencyInput";

interface Wallet {
	id: string;
	name: string;
	type: string;
	balance: number;
}

export const WalletPage: React.FC = () => {
	const { user } = useAuth();
	const { showToast } = useToast();
	const [wallets, setWallets] = useState<Wallet[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// Modal States
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
	const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null);

	// Form States
	const [newWallet, setNewWallet] = useState({ name: "", type: "CASH", balance: 0 });
	const [transferData, setTransferData] = useState({ sourceWalletId: "", destinationWalletId: "", amount: 0 });
	const [isSubmitting, setIsSubmitting] = useState(false);

	const formatIDR = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);

	// 1. FUNGSI LOAD DATA DOMPET DARI FIREBASE
	const fetchWallets = async () => {
		if (!user) return;
		try {
			const q = query(collection(db, "wallets"), where("userId", "==", user.id));
			const querySnapshot = await getDocs(q);

			const fetchedWallets: Wallet[] = [];
			querySnapshot.forEach((doc) => {
				fetchedWallets.push({ id: doc.id, ...doc.data() } as Wallet);
			});

			// Urutkan manual berdasarkan nama
			fetchedWallets.sort((a, b) => a.name.localeCompare(b.name));
			setWallets(fetchedWallets);
		} catch (err) {
			showToast("Gagal memuat data dompet.", "error");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchWallets();
	}, [user]);

	// 2. FUNGSI TAMBAH DOMPET BARU
	const handleAddWallet = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newWallet.name) return showToast("Nama dompet wajib diisi", "error");

		setIsSubmitting(true);
		try {
			await addDoc(collection(db, "wallets"), {
				userId: user?.id,
				name: newWallet.name,
				type: newWallet.type,
				balance: Number(newWallet.balance),
				isActive: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});

			showToast("Dompet berhasil ditambahkan!", "success");
			setIsAddModalOpen(false);
			setNewWallet({ name: "", type: "CASH", balance: 0 });
			fetchWallets(); // Refresh data
		} catch (err) {
			showToast("Gagal menambahkan dompet.", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	// 3. FUNGSI TRANSFER ANTAR DOMPET (Menggunakan writeBatch)
	const handleTransfer = async (e: React.FormEvent) => {
		e.preventDefault();
		if (transferData.sourceWalletId === transferData.destinationWalletId) {
			return showToast("Dompet asal dan tujuan tidak boleh sama.", "error");
		}
		if (transferData.amount <= 0) {
			return showToast("Nominal transfer tidak valid.", "error");
		}

		setIsSubmitting(true);
		try {
			const sourceWallet = wallets.find((w) => w.id === transferData.sourceWalletId);
			const destWallet = wallets.find((w) => w.id === transferData.destinationWalletId);

			if (!sourceWallet || !destWallet) throw new Error("Dompet tidak ditemukan");
			if (sourceWallet.balance < transferData.amount) throw new Error("Saldo dompet asal tidak mencukupi");

			// Menggunakan Batch agar jika salah satu gagal, semuanya dibatalkan
			const batch = writeBatch(db);
			const sourceRef = doc(db, "wallets", sourceWallet.id);
			const destRef = doc(db, "wallets", destWallet.id);

			batch.update(sourceRef, {
				balance: sourceWallet.balance - transferData.amount,
				updatedAt: new Date().toISOString(),
			});
			batch.update(destRef, {
				balance: destWallet.balance + transferData.amount,
				updatedAt: new Date().toISOString(),
			});

			await batch.commit();

			showToast("Transfer berhasil dicatat!", "success");
			setIsTransferModalOpen(false);
			setTransferData({ sourceWalletId: "", destinationWalletId: "", amount: 0 });
			fetchWallets();
		} catch (err: any) {
			showToast(err.message || "Gagal melakukan transfer.", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	// 4. FUNGSI HAPUS DOMPET
	const handleDeleteWallet = async () => {
		if (!walletToDelete) return;

		setIsSubmitting(true);
		try {
			await deleteDoc(doc(db, "wallets", walletToDelete.id));
			showToast(`Dompet ${walletToDelete.name} dihapus.`, "success");
			setWalletToDelete(null);
			fetchWallets();
		} catch (err) {
			showToast("Gagal menghapus dompet.", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="h-full w-full flex items-center justify-center">
				<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 dark:border-slate-100"></div>
			</div>
		);
	}

	return (
		<div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
			{/* HEADER */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold font-display tracking-wide text-slate-900 dark:text-slate-100">Manajemen Dompet</h1>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola aset kas, rekening bank, dan dompet digital Anda.</p>
				</div>
				<div className="flex gap-3">
					<button
						onClick={() => setIsTransferModalOpen(true)}
						className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm active:scale-95">
						<ArrowRightLeft size={16} />
						<span className="hidden sm:inline">Transfer</span>
					</button>
					<button
						onClick={() => setIsAddModalOpen(true)}
						className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20 active:scale-95">
						<Plus size={16} />
						<span className="hidden sm:inline">Tambah Dompet</span>
					</button>
				</div>
			</div>

			{/* GRID DOMPET */}
			{wallets.length === 0 ? (
				<div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
					<WalletIcon
						size={48}
						className="mx-auto text-slate-300 dark:text-slate-700 mb-4"
					/>
					<h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Belum Ada Dompet</h3>
					<p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">Anda belum mendaftarkan aset finansial apa pun. Tambahkan dompet pertama Anda untuk mulai melacak keuangan.</p>
					<button
						onClick={() => setIsAddModalOpen(true)}
						className="mt-6 px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm rounded-lg transition-transform active:scale-95">
						Buat Dompet Pertama
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
					{wallets.map((wallet) => (
						<div
							key={wallet.id}
							className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative group transition-colors duration-300">
							<div className="flex justify-between items-start mb-4">
								<div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">{wallet.type === "BANK" ? <CreditCard size={20} /> : <WalletIcon size={20} />}</div>
								<button
									onClick={() => setWalletToDelete(wallet)}
									className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors md:opacity-0 md:group-hover:opacity-100">
									<Trash2 size={16} />
								</button>
							</div>
							<h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-1">{wallet.name}</h3>
							<p className="text-xs font-semibold tracking-wider uppercase text-slate-400 mb-4">{wallet.type}</p>
							<div className="pt-4 border-t border-slate-100 dark:border-slate-800">
								<p className="text-xs text-slate-500 mb-1">Total Saldo</p>
								<p className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">{formatIDR(wallet.balance)}</p>
							</div>
						</div>
					))}
				</div>
			)}

			{/* MODAL 1: Tambah Dompet */}
			<Modal
				isOpen={isAddModalOpen}
				onClose={() => setIsAddModalOpen(false)}
				title="Tambah Aset Baru">
				<form
					onSubmit={handleAddWallet}
					className="space-y-4">
					<div>
						<label className="label-base">Nama Dompet / Rekening</label>
						<input
							type="text"
							required
							placeholder="BCA / Gopay / Dompet Tunai"
							className="input-base"
							value={newWallet.name}
							onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })}
							disabled={isSubmitting}
						/>
					</div>
					<div>
						<label className="label-base">Kategori Aset</label>
						<select
							className="input-base"
							value={newWallet.type}
							onChange={(e) => setNewWallet({ ...newWallet, type: e.target.value })}
							disabled={isSubmitting}>
							<option value="CASH">Uang Tunai (Cash)</option>
							<option value="BANK">Rekening Bank</option>
							<option value="E_WALLET">E-Wallet</option>
							<option value="INVESTMENT">Investasi</option>
						</select>
					</div>
					<CurrencyInput
						label="Saldo Awal"
						value={newWallet.balance}
						onChange={(val) => setNewWallet({ ...newWallet, balance: val })}
						disabled={isSubmitting}
					/>
					<div className="pt-2">
						<button
							type="submit"
							className="btn-slate-primary h-10 flex items-center justify-center w-full"
							disabled={isSubmitting}>
							{isSubmitting ? "Menyimpan..." : "Simpan Aset"}
						</button>
					</div>
				</form>
			</Modal>

			{/* MODAL 2: Transfer Saldo */}
			<Modal
				isOpen={isTransferModalOpen}
				onClose={() => setIsTransferModalOpen(false)}
				title="Mutasi Antar Dompet">
				<form
					onSubmit={handleTransfer}
					className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="label-base text-red-600 dark:text-red-400">Tarik dari</label>
							<select
								required
								className="input-base"
								value={transferData.sourceWalletId}
								onChange={(e) => setTransferData({ ...transferData, sourceWalletId: e.target.value })}
								disabled={isSubmitting}>
								<option
									value=""
									disabled>
									Pilih Sumber
								</option>
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
							<label className="label-base text-green-600 dark:text-green-400">Kirim ke</label>
							<select
								required
								className="input-base"
								value={transferData.destinationWalletId}
								onChange={(e) => setTransferData({ ...transferData, destinationWalletId: e.target.value })}
								disabled={isSubmitting}>
								<option
									value=""
									disabled>
									Pilih Tujuan
								</option>
								{wallets.map((w) => (
									<option
										key={w.id}
										value={w.id}>
										{w.name}
									</option>
								))}
							</select>
						</div>
					</div>
					<CurrencyInput
						label="Nominal Mutasi"
						required
						value={transferData.amount}
						onChange={(val) => setTransferData({ ...transferData, amount: val })}
						disabled={isSubmitting}
					/>
					<div className="pt-2">
						<button
							type="submit"
							className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
							disabled={isSubmitting}>
							{isSubmitting ? "Memproses..." : "Kirim Saldo"}
						</button>
					</div>
				</form>
			</Modal>

			{/* MODAL 3: Konfirmasi Hapus */}
			<Modal
				isOpen={!!walletToDelete}
				onClose={() => setWalletToDelete(null)}
				title="Konfirmasi Penghapusan">
				<div className="space-y-4">
					<p className="text-sm text-slate-600 dark:text-slate-300">
						Apakah Anda yakin ingin menghapus dompet <strong className="text-slate-900 dark:text-slate-100">{walletToDelete?.name}</strong>? Saldo yang tersisa sebesar {formatIDR(walletToDelete?.balance || 0)} akan ikut tidak terhitung
						dalam total aset, tetapi riwayat transaksinya tetap aman.
					</p>
					<div className="flex gap-3 pt-2">
						<button
							type="button"
							onClick={() => setWalletToDelete(null)}
							className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
							disabled={isSubmitting}>
							Batal
						</button>
						<button
							onClick={handleDeleteWallet}
							className="flex-1 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
							disabled={isSubmitting}>
							{isSubmitting ? "Menghapus..." : "Hapus Permanen"}
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
};
