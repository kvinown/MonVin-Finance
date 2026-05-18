import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { User, Mail, Shield, Moon, Sun, LogOut } from "lucide-react";

export const ProfilePage: React.FC = () => {
	const { user, logout } = useAuth();
	const { theme, toggleTheme } = useTheme();

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			<div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start">
				<div className="h-24 w-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-4xl border border-slate-200 dark:border-slate-700 shrink-0">
					{user?.name?.charAt(0).toUpperCase()}
				</div>
				<div className="flex-1 text-center md:text-left space-y-1">
					<h2 className="text-2xl font-bold font-display tracking-tight">{user?.name}</h2>
					<p className="text-sm font-medium text-blue-600 dark:text-blue-400">@{user?.username}</p>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto md:mx-0">Terima kasih telah mempercayakan manajemen finansial Anda pada arsitektur sistem komputasi MonVin.</p>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Card Informasi Akun */}
				<div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
					<div className="p-5 border-b border-slate-200 dark:border-slate-800">
						<h3 className="font-bold tracking-wide flex items-center gap-2">
							<User
								size={18}
								className="text-slate-400"
							/>{" "}
							Informasi Personal
						</h3>
					</div>
					<div className="p-5 space-y-4">
						<div>
							<div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Nama Lengkap</div>
							<div className="font-medium text-slate-900 dark:text-slate-100">{user?.name}</div>
						</div>
						<div>
							<div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Alamat Email</div>
							<div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
								<Mail
									size={16}
									className="text-slate-400"
								/>{" "}
								{user?.email}
							</div>
						</div>
						<div>
							<div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">ID Pengguna (UUID)</div>
							<div className="font-mono text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 break-all">{user?.id}</div>
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
