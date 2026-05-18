import React, { useEffect, useState } from "react";
import API from "../services/api";
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

	const fetchWallets = async () => {
		setIsLoading(true);
		try {
			const res = await API.get("/wallets");
			setWallets(res.data.data);
		} catch (err) {
			showToast("Gagal memuat data dompet.", "error");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchWallets();
	}, []);

	// --- Handlers ---
	const handleAddWallet = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			await API.post("/wallets", newWallet);
			showToast("Dompet baru berhasil ditambahkan!", "success");
			setIsAddModalOpen(false);
			setNewWallet({ name: "", type: "CASH", balance: 0 });
			fetchWallets();
		} catch (err: any) {
			showToast(err.message || "Gagal menambahkan dompet.", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleTransfer = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			await API.post("/wallets/transfer", transferData);
			showToast("Transfer saldo berhasil!", "success");
			setIsTransferModalOpen(false);
			setTransferData({ sourceWalletId: "", destinationWalletId: "", amount: 0 });
			fetchWallets();
		} catch (err: any) {
			showToast(err.message || "Gagal melakukan transfer.", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeleteWallet = async () => {
		if (!walletToDelete) return;
		setIsSubmitting(true);
		try {
			await API.delete(`/wallets/${walletToDelete.id}`);
			showToast("Dompet berhasil dihapus (Soft Delete).", "success");
			setWalletToDelete(null);
			fetchWallets();
		} catch (err: any) {
			showToast(err.message || "Gagal menghapus dompet.", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100"></div>
			</div>
		);
	}

	return (
		<div className="max-w-6xl mx-auto space-y-6">
			{/* Header & Aksi */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
				<div>
					<h2 className="text-xl font-bold font-display tracking-wide">Ekosistem Kas</h2>
					<p className="text-sm text-slate-500 mt-1">Kelola rekening dan dompet tunai Anda di sini.</p>
				</div>
				<div className="flex gap-3 w-full sm:w-auto">
					<button
						onClick={() => setIsTransferModalOpen(true)}
						className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-sm rounded-lg transition-colors">
						<ArrowRightLeft size={16} /> Transfer Saldo
					</button>
					<button
						onClick={() => setIsAddModalOpen(true)}
						className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm shadow-blue-500/20">
						<Plus size={16} /> Tambah Dompet
					</button>
				</div>
			</div>

			{/* Grid Dompet */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{wallets.map((wallet) => (
					<div
						key={wallet.id}
						className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-shadow relative group">
						<div className="flex justify-between items-start mb-4">
							<div className={`p-3 rounded-xl ${wallet.type === "BANK" ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"}`}>
								{wallet.type === "BANK" ? <CreditCard size={24} /> : <WalletIcon size={24} />}
							</div>

							<button
								onClick={() => setWalletToDelete(wallet)}
								className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
								title="Hapus Dompet">
								<Trash2 size={16} />
							</button>
						</div>

						<div>
							<div className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-1">{wallet.type}</div>
							<div className="font-semibold text-lg truncate mb-3">{wallet.name}</div>
							<div className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-slate-100">{formatIDR(wallet.balance)}</div>
						</div>
					</div>
				))}

				{wallets.length === 0 && (
					<div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
						<WalletIcon
							size={48}
							className="mx-auto text-slate-300 mb-4"
						/>
						<p className="text-slate-500 font-medium">Belum ada dompet yang terdaftar.</p>
					</div>
				)}
			</div>

			{/* MODAL 1: Tambah Dompet */}
			<Modal
				isOpen={isAddModalOpen}
				onClose={() => setIsAddModalOpen(false)}
				title="Tambah Dompet Baru">
				<form
					onSubmit={handleAddWallet}
					className="space-y-4">
					<div>
						<label className="label-base">Nama Dompet (Mis: BCA, BNI, Dompet Tunai)</label>
						<input
							type="text"
							required
							className="input-base"
							value={newWallet.name}
							onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })}
							disabled={isSubmitting}
						/>
					</div>
					<div>
						<label className="label-base">Tipe Penyimpanan</label>
						<select
							className="input-base"
							value={newWallet.type}
							onChange={(e) => setNewWallet({ ...newWallet, type: e.target.value })}
							disabled={isSubmitting}>
							<option value="CASH">Tunai / Dompet Fisik</option>
							<option value="BANK">Rekening Bank / E-Wallet</option>
						</select>
					</div>
					{/* Ganti input number saldo lama dengan ini */}
					<CurrencyInput
						label="Saldo Awal"
						required
						value={newWallet.balance}
						onChange={(val) => setNewWallet({ ...newWallet, balance: val })}
						disabled={isSubmitting}
					/>
					<div className="pt-2">
						<button
							type="submit"
							className="btn-slate-primary"
							disabled={isSubmitting}>
							{isSubmitting ? "Menyimpan..." : "Simpan Dompet"}
						</button>
					</div>
				</form>
			</Modal>

			{/* MODAL 2: Transfer Saldo */}
			<Modal
				isOpen={isTransferModalOpen}
				onClose={() => setIsTransferModalOpen(false)}
				title="Transfer Antar Dompet">
				<form
					onSubmit={handleTransfer}
					className="space-y-4">
					<div>
						<label className="label-base">Dari Dompet (Sumber)</label>
						<select
							required
							className="input-base"
							value={transferData.sourceWalletId}
							onChange={(e) => setTransferData({ ...transferData, sourceWalletId: e.target.value })}
							disabled={isSubmitting}>
							<option value="">Pilih Dompet Sumber...</option>
							{wallets.map((w) => (
								<option
									key={w.id}
									value={w.id}>
									{w.name} (Sisa: {formatIDR(w.balance)})
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="label-base">Ke Dompet (Tujuan)</label>
						<select
							required
							className="input-base"
							value={transferData.destinationWalletId}
							onChange={(e) => setTransferData({ ...transferData, destinationWalletId: e.target.value })}
							disabled={isSubmitting}>
							<option value="">Pilih Dompet Tujuan...</option>
							{wallets
								.filter((w) => w.id !== transferData.sourceWalletId)
								.map((w) => (
									<option
										key={w.id}
										value={w.id}>
										{w.name}
									</option>
								))}
						</select>
					</div>
					{/* Ganti input number nominal transfer lama dengan ini */}
					<CurrencyInput
						label="Nominal Transfer"
						required
						value={transferData.amount}
						onChange={(val) => setTransferData({ ...transferData, amount: val })}
						disabled={isSubmitting}
					/>
					<div className="pt-2">
						<button
							type="submit"
							className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
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
							type="button"
							onClick={handleDeleteWallet}
							className="flex-1 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
							disabled={isSubmitting}>
							{isSubmitting ? "Menghapus..." : "Ya, Hapus Dompet"}
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
};
