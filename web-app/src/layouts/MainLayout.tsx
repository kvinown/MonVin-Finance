import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Navbar } from "../components/Navbar";

export const MainLayout: React.FC = () => {
	// Lifted state khusus untuk mengontrol drawer mobile
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

	return (
		<div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
			{/* Komponen Sidebar Kiri */}
			<Sidebar
				isMobileOpen={isMobileSidebarOpen}
				onCloseMobile={() => setIsMobileSidebarOpen(false)}
			/>

			{/* Kontainer Utama Sisi Kanan */}
			<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
				{/* Komponen Navbar Atas */}
				<Navbar onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)} />

				{/* Area Render Halaman Konten */}
				<main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
					<Outlet />
				</main>
			</div>
		</div>
	);
};
