import React from "react";

interface CurrencyInputProps {
	value: number;
	onChange: (value: number) => void;
	label?: string;
	disabled?: boolean;
	placeholder?: string;
	required?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, label, disabled = false, placeholder = "0", required = false }) => {
	// Format angka murni menjadi string dengan pemisah titik
	const formatDisplay = (num: number) => {
		if (num === 0) return "";
		return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	};

	// Bersihkan input dari karakter non-angka sebelum melempar value ke parent state
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const rawValue = e.target.value.replace(/\D/g, "");
		onChange(Number(rawValue));
	};

	return (
		<div>
			{label && <label className="label-base">{label}</label>}
			<div className="relative">
				{/* Ornamen Rp Statis */}
				<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
					<span className="text-slate-500 dark:text-slate-400 font-semibold text-sm">Rp</span>
				</div>
				<input
					type="text"
					required={required}
					placeholder={placeholder}
					className="input-base pl-10"
					value={formatDisplay(value)}
					onChange={handleChange}
					disabled={disabled}
				/>
			</div>
		</div>
	);
};
