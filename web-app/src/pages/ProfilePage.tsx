import React, { useState, useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { User, Shield, LogOut, Edit2, Check, X, Moon, Sun, Calendar } from "lucide-react";

export const ProfilePage: React.FC = () => {
	const { user, logout, updateUserContext } = useAuth();
	const { theme, toggleTheme } = useTheme();
	const { showToast } = useToast();

	const [isEditing, setIsEditing] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		username: "",
		birthDate: "",
		status: "",
		field: "",
		location: "",
	});

	useEffect(() => {
		if (user) {
			setFormData({
				name: user.name || "",
				username: user.username || "",
				birthDate: user.birthDate || "",
				status: user.status || "",
				field: user.field || "",
				location: user.location || "",
			});
		}
	}, [user]);

	// Fungsi Hitung Umur Real-time
	const calculateAge = (dob: string) => {
		if (!dob) return "-";
		const today = new Date();
		const birthDateObj = new Date(dob);
		let age = today.getFullYear() - birthDateObj.getFullYear();
		const m = today.getMonth() - birthDateObj.getMonth();
		if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
			age--;
		}
		return age;
	};

	const handleSaveProfile = async () => {
		if (!user) return;
		setIsSubmitting(true);
		try {
			const userRef = doc(db, "users", user.id);
			// Menggunakan setDoc dengan merge: true menjamin data tersimpan
			// tanpa menghapus field lain jika struktur database tidak rapi
			await setDoc(
				userRef,
				{
					name: formData.name,
					username: formData.username,
					birthDate: formData.birthDate,
					status: formData.status,
					field: formData.field,
					location: formData.location,
					updatedAt: new Date().toISOString(),
				},
				{ merge: true },
			);

			updateUserContext(formData);
			showToast("Profil berhasil diperbarui dan tersimpan", "success");
			setIsEditing(false);
		} catch (err) {
			showToast("Gagal memperbarui profil ke database", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
			<div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start">
				<div className="h-24 w-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-4xl border border-slate-200 dark:border-slate-700 shrink-0">
					{user?.name?.charAt(0).toUpperCase()}
				</div>
				<div className="flex-1 text-center md:text-left space-y-1 mt-2">
					<h2 className="text-2xl font-bold font-display tracking-tight">{user?.name}</h2>
					<p className="text-sm font-medium text-blue-600 dark:text-blue-400">@{user?.username || "pengguna"}</p>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto md:mx-0">Lengkapi profil Anda agar sistem Kecerdasan Buatan (AI) dapat memberikan rekomendasi finansial yang presisi dan relevan.</p>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Card Informasi Personal (Editable) */}
				<div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
					<div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
						<h3 className="font-bold tracking-wide flex items-center gap-2">
							<User
								size={18}
								className="text-slate-400"
							/>{" "}
							Profil Pengguna
						</h3>
						{!isEditing ? (
							<button
								onClick={() => setIsEditing(true)}
								className="text-blue-600 text-sm font-semibold flex items-center gap-1 hover:underline">
								<Edit2 size={14} /> Edit
							</button>
						) : (
							<div className="flex items-center gap-3">
								<button
									onClick={() => setIsEditing(false)}
									className="text-slate-500 hover:text-slate-700"
									disabled={isSubmitting}>
									<X size={18} />
								</button>
								<button
									onClick={handleSaveProfile}
									className="text-green-600 font-semibold flex items-center gap-1"
									disabled={isSubmitting}>
									{isSubmitting ? (
										"..."
									) : (
										<>
											<Check size={16} /> Simpan
										</>
									)}
								</button>
							</div>
						)}
					</div>

					<div className="p-5 space-y-4">
						<div>
							<label className="label-base">Alamat Email (Tidak dapat diubah)</label>
							<input
								type="email"
								className="input-base bg-slate-50 dark:bg-slate-950 text-slate-500 cursor-not-allowed"
								value={user?.email || ""}
								disabled
							/>
						</div>
						<div>
							<label className="label-base">Username</label>
							<input
								type="text"
								className="input-base"
								value={formData.username}
								onChange={(e) => setFormData({ ...formData, username: e.target.value })}
								disabled={!isEditing}
							/>
						</div>
						<div>
							<label className="label-base">Nama Lengkap</label>
							<input
								type="text"
								className="input-base"
								value={formData.name}
								onChange={(e) => setFormData({ ...formData, name: e.target.value })}
								disabled={!isEditing}
							/>
						</div>

						<div className="pt-4 border-t border-slate-100 dark:border-slate-800">
							<h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Data Personalisasi AI (Opsional)</h4>
							<div className="grid grid-cols-2 gap-4">
								<div className="col-span-2 sm:col-span-1">
									<label className="label-base flex justify-between">
										Tanggal Lahir
										{formData.birthDate && <span className="text-blue-600 lowercase normal-case">({calculateAge(formData.birthDate)} thn)</span>}
									</label>
									<input
										type="date"
										className="input-base"
										value={formData.birthDate}
										onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
										disabled={!isEditing}
									/>
								</div>
								<div className="col-span-2 sm:col-span-1">
									<label className="label-base">Status Profesi</label>
									<input
										type="text"
										placeholder="Mis: Mahasiswa, Karyawan"
										className="input-base"
										value={formData.status}
										onChange={(e) => setFormData({ ...formData, status: e.target.value })}
										disabled={!isEditing}
									/>
								</div>
								<div className="col-span-2 sm:col-span-1">
									<label className="label-base">Bidang / Jurusan</label>
									<input
										type="text"
										placeholder="Mis: IT, Hukum"
										className="input-base"
										value={formData.field}
										onChange={(e) => setFormData({ ...formData, field: e.target.value })}
										disabled={!isEditing}
									/>
								</div>
								<div className="col-span-2 sm:col-span-1">
									<label className="label-base">Domisili Kota</label>
									<input
										type="text"
										placeholder="Mis: Bandung, Jakarta"
										className="input-base"
										value={formData.location}
										onChange={(e) => setFormData({ ...formData, location: e.target.value })}
										disabled={!isEditing}
									/>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Card Preferensi & Keamanan */}
				<div className="space-y-6">
					<div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
						<div className="p-5 border-b border-slate-200 dark:border-slate-800">
							<h3 className="font-bold tracking-wide flex items-center gap-2">
								<Shield
									size={18}
									className="text-slate-400"
								/>{" "}
								Preferensi Sistem
							</h3>
						</div>
						<div className="p-5 space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<div className="font-medium text-slate-900 dark:text-slate-100">Tema Visual</div>
									<div className="text-xs text-slate-500">Sesuaikan antarmuka dengan kenyamanan mata Anda.</div>
								</div>
								<button
									onClick={toggleTheme}
									className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg transition-colors">
									{theme === "light" ? (
										<>
											<Moon size={16} /> Gelap
										</>
									) : (
										<>
											<Sun size={16} /> Terang
										</>
									)}
								</button>
							</div>
						</div>
					</div>

					<button
						onClick={logout}
						className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 font-bold text-sm rounded-xl transition-colors border border-red-200 dark:border-red-900/50">
						<LogOut size={18} /> Keluar dari Aplikasi
					</button>
				</div>
			</div>
		</div>
	);
};
