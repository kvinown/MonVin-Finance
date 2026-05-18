import React, { createContext, useContext, useState, useEffect } from "react";
import API from "../services/api";

interface User {
	id: string;
	name: string;
	email: string;
	username: string;
}

interface AuthContextType {
	user: User | null;
	loading: boolean;
	login: (token: string, userData: User) => void;
	logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	// Cek session saat pertama kali app dijalankan
	useEffect(() => {
		const checkUser = async () => {
			const token = localStorage.getItem("token");
			if (!token) {
				setLoading(false);
				return;
			}

			try {
				const res = await API.get("/users/me"); // Endpoint yang kita buat di backend tadi
				setUser(res.data.data);
			} catch (err) {
				localStorage.removeItem("token");
				localStorage.removeItem("user");
			} finally {
				setLoading(false);
			}
		};
		checkUser();
	}, []);

	const login = (token: string, userData: User) => {
		localStorage.setItem("token", token);
		localStorage.setItem("user", JSON.stringify(userData));
		setUser(userData);
	};

	const logout = () => {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		setUser(null);
		window.location.href = "/login";
	};

	return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuth must be used within AuthProvider");
	return context;
};
