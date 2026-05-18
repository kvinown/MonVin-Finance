import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
	theme: Theme;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	// Ambil tema awal dari localStorage agar tidak reset saat refresh
	const [theme, setTheme] = useState<Theme>(() => {
		const savedTheme = localStorage.getItem("theme");
		return (savedTheme as Theme) || "light";
	});

	// Efek untuk memanipulasi class 'dark' pada elemen HTML root
	useEffect(() => {
		const root = window.document.documentElement;
		if (theme === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
		// Simpan preferensi tema ke localStorage frontend
		localStorage.setItem("theme", theme);
	}, [theme]);

	const toggleTheme = () => {
		setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
	};

	return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

// Custom hook agar kita tinggal memanggil useTheme() di komponen mana saja
export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme harus digunakan di dalam ThemeProvider");
	}
	return context;
};
