import React, { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { Moon, Sun, LogOut, User as UserIcon, Menu, ChevronDown } from "lucide-react";

interface NavbarProps {
	onOpenMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileSidebar }) => {
	const { user, logout } = useAuth();
	const { theme, toggleTheme } = useTheme();
	const location = useLocation();
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Menutup dropdown secara otomatis saat pengguna mengklik area luar form
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const getPageTitle = () => {
		const path = location.pathname;
		if (path.startsWith("/dashboard")) return "Dasbor Finansial";
		if (path.startsWith("/wallets")) return "Manajemen Dompet";
		if (path.startsWith("/transactions")) return "Riwayat Transaksi";
		if (path.startsWith("/profile")) return "Profil Pengguna";
		return "MonVin Finance";
	};

	return (
		<header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 transition-colors duration-300 shadow-sm z-10 shrink-0">
			{/* SISI KIRI: Tombol Pemicu Mobile & Judul */}
			<div className="flex items-center gap-3">
				<button
					onClick={onOpenMobileSidebar}
					className="p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 md:hidden rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
					<Menu size={20} />
				</button>
				<div className="hidden md:block text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-300">{getPageTitle()}</div>
				<div className="md:hidden font-bold font-display text-lg tracking-wider text-slate-900 dark:text-slate-100">MonVin.</div>
			</div>

			{/* SISI KANAN: Saklar Tema & Dropdown Profil Profesional */}
			<div className="flex items-center gap-2 md:gap-4">
				<button
					onClick={toggleTheme}
					className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
					{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
				</button>

				<div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>

				{/* Komponen Dropdown Profil */}
				<div
					className="relative"
					ref={dropdownRef}>
					<button
						onClick={() => setIsDropdownOpen(!isDropdownOpen)}
						className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none">
						<div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-sm border border-slate-200 dark:border-slate-700">
							{user?.name?.charAt(0).toUpperCase()}
						</div>
						<span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">{user?.name}</span>
						<ChevronDown
							size={14}
							className="text-slate-400 hidden sm:block transition-transform duration-200"
							style={{ transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
						/>
					</button>

					{/* Isi Menu Dropdown Menu Floating */}
					{isDropdownOpen && (
						<div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 z-50 animate-fadeIn">
							<div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
								<p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.name}</p>
								<p className="text-xs text-slate-400 truncate">@{user?.username}</p>
							</div>

							<Link
								to="/profile"
								onClick={() => setIsDropdownOpen(false)}
								className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
								<UserIcon
									size={16}
									className="text-slate-400"
								/>
								Profil Saya
							</Link>

							<button
								onClick={() => {
									setIsDropdownOpen(false);
									logout();
								}}
								className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors border-t border-slate-100 dark:border-slate-800 mt-1.5 pt-2">
								<LogOut size={16} />
								Keluar Aplikasi
							</button>
						</div>
					)}
				</div>
			</div>
		</header>
	);
};
