import React from "react";
import { useTheme } from "../contexts/ThemeContext";

interface AuthLayoutProps {
	children: React.ReactNode;
	title: string;
	subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
	const { theme, toggleTheme } = useTheme();

	return (
		<div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
			{/* Panel Kiri: Brand & Estetika (Sembunyi di Mobile) - REUSEABLE */}
			<div className="hidden md:flex md:w-1/2 bg-slate-900 dark:bg-slate-900 p-12 flex-col justify-between text-slate-100 relative overflow-hidden border-r border-slate-800">
				<div className="text-xl font-bold tracking-wider uppercase font-display">MonVin.</div>
				<div className="max-w-md space-y-4 z-10">
					<h2 className="text-4xl font-display leading-tight tracking-wide">Efisiensi finansial mutakhir melalui kecerdasan komputasi.</h2>
					<p className="text-slate-400 text-sm tracking-wide leading-relaxed">Kelola multi-aset, pantau ekosistem kas, dan dapatkan analisis restrukturisasi pengeluaran berbasis AI secara dinamis.</p>
				</div>
				<div className="text-xs text-slate-500 tracking-widest uppercase">&copy; {new Date().getFullYear()} MonVin Finance Technology. All Rights Reserved.</div>
			</div>

			{/* Panel Kanan: Kontainer Dinamis untuk Form Login / Register */}
			<div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative">
				{/* Tombol Toggle Tema */}
				<button
					onClick={toggleTheme}
					className="absolute top-6 right-6 p-2 text-xs font-semibold tracking-widest uppercase text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
					{theme === "light" ? "Dark Mode" : "Light Mode"}
				</button>

				<div className="w-full max-w-sm space-y-8">
					<div>
						<div className="text-sm font-bold tracking-widest uppercase text-blue-600 dark:text-blue-400 mb-2">Sistem Otentikasi</div>
						<h1 className="text-3xl font-bold font-display tracking-tight">{title}</h1>
						{subtitle && <p className="text-slate-500 text-sm mt-2">{subtitle}</p>}
					</div>

					{/* Render Form (Login atau Register) di sini */}
					{children}
				</div>
			</div>
		</div>
	);
};
