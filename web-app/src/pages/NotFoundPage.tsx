import React from "react";
import { Link } from "react-router-dom";
import { Home, AlertCircle } from "lucide-react";

export const NotFoundPage: React.FC = () => {
	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 px-6">
			<div className="text-center max-w-md">
				<div className="flex justify-center mb-6 text-blue-600 dark:text-blue-500">
					<AlertCircle
						size={80}
						strokeWidth={1.5}
					/>
				</div>
				<h1 className="text-6xl font-display font-bold tracking-tight mb-4">404</h1>
				<h2 className="text-2xl font-semibold tracking-wide mb-3">Halaman Tidak Ditemukan</h2>
				<p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">Maaf, rute yang Anda tuju tidak tersedia di dalam sistem MonVin Finance. Kemungkinan tautan telah rusak atau halaman telah dipindahkan.</p>
				<Link
					to="/dashboard"
					className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-all shadow-sm shadow-blue-500/20 active:scale-95">
					<Home size={18} />
					Kembali ke Dasbor Utama
				</Link>
			</div>
		</div>
	);
};
