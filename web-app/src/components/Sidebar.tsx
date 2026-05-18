import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Wallet, ArrowRightLeft, X } from "lucide-react";

interface SidebarProps {
	isMobileOpen: boolean;
	onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
	const location = useLocation();

	const navItems = [
		{ name: "Dasbor", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
		{ name: "Dompet", path: "/wallets", icon: <Wallet size={18} /> },
		{ name: "Transaksi", path: "/transactions", icon: <ArrowRightLeft size={18} /> },
	];

	// Konten internal sidebar agar DRY (Don't Repeat Yourself)
	const SidebarContent = () => (
		<div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 transition-colors duration-300">
			{/* Sidebar Header */}
			<div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
				<span className="text-xl font-bold tracking-wider uppercase font-display text-slate-900 dark:text-slate-100">MonVin.</span>
				{/* Tombol Close Silang - Hanya muncul di Mobile */}
				<button
					onClick={onCloseMobile}
					className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 md:hidden rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
					<X size={18} />
				</button>
			</div>

			{/* Menu Navigasi */}
			<nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
				<div className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-widest uppercase mb-4 px-2">Menu Utama</div>
				{navItems.map((item) => {
					const isActive = location.pathname.startsWith(item.path);
					return (
						<Link
							key={item.name}
							to={item.path}
							onClick={onCloseMobile} // Otomatis tutup sidebar drawer di mobile setelah klik menu
							className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all tracking-wide text-sm ${
								isActive ? "bg-blue-600 text-white font-medium shadow-sm shadow-blue-500/20" : "hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
							}`}>
							{item.icon}
							{item.name}
						</Link>
					);
				})}
			</nav>
		</div>
	);

	return (
		<>
			{/* VIEW DESKTOP: Sidebar Statis Menetap */}
			<aside className="w-64 hidden md:flex flex-col h-full shrink-0">
				<SidebarContent />
			</aside>

			{/* VIEW MOBILE: Sidebar Overlay Drawer */}
			<div className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
				{/* Lapisan Blur Hitam Transparan di Belakang */}
				<div
					className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
					onClick={onCloseMobile}></div>

				{/* Kotak Konten Drawer Menghanyut dari Kiri */}
				<div className={`absolute inset-y-0 left-0 w-64 transform transition-transform duration-300 ease-in-out ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
					<SidebarContent />
				</div>
			</div>
		</>
	);
};
