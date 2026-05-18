import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
	id: string;
	message: string;
	type: ToastType;
}

interface ToastContextType {
	showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const showToast = useCallback((message: string, type: ToastType) => {
		const id = Math.random().toString(36).substr(2, 9);
		setToasts((prev) => [...prev, { id, message, type }]);

		// Otomatis hilang setelah 3 detik
		setTimeout(() => {
			setToasts((prev) => prev.filter((toast) => toast.id !== id));
		}, 3000);
	}, []);

	const removeToast = (id: string) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id));
	};

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}

			{/* Kontainer Render Toast di Kanan Bawah Layar */}
			<div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
				{toasts.map((toast) => {
					// Penentuan Warna & Ikon berdasarkan Tipe
					const isSuccess = toast.type === "success";
					const isError = toast.type === "error";
					const isInfo = toast.type === "info";

					const bgClass = isSuccess
						? "bg-green-50 dark:bg-green-950/80 border-green-200 dark:border-green-900 text-green-700 dark:text-green-300"
						: isError
							? "bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300"
							: "bg-blue-50 dark:bg-blue-950/80 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300";

					const Icon = isSuccess ? CheckCircle : isError ? AlertCircle : Info;

					return (
						<div
							key={toast.id}
							className={`flex items-start gap-3 p-4 border rounded-xl shadow-lg w-80 pointer-events-auto animate-slideInUp backdrop-blur-sm ${bgClass}`}>
							<Icon
								size={20}
								className="shrink-0 mt-0.5"
							/>
							<p className="text-sm font-medium tracking-wide flex-1 leading-relaxed">{toast.message}</p>
							<button
								onClick={() => removeToast(toast.id)}
								className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
								<X size={16} />
							</button>
						</div>
					);
				})}
			</div>
		</ToastContext.Provider>
	);
};

export const useToast = () => {
	const context = useContext(ToastContext);
	if (!context) throw new Error("useToast harus digunakan di dalam ToastProvider");
	return context;
};
