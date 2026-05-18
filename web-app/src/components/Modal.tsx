import React from "react";
import { X } from "lucide-react";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
			{/* Box Modal */}
			<div
				className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
				onClick={(e) => e.stopPropagation()}>
				{/* Header Modal */}
				<div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
					<h3 className="font-bold text-slate-900 dark:text-slate-100 tracking-wide">{title}</h3>
					<button
						onClick={onClose}
						className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
						<X size={20} />
					</button>
				</div>

				{/* Konten Modal */}
				<div className="p-5">{children}</div>
			</div>
		</div>
	);
};
