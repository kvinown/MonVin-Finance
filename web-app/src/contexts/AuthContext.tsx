import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

interface User {
	id: string;
	name: string;
	email: string;
	username: string;
	birthDate?: string; // Diubah dari age menjadi birthDate
	status?: string;
	field?: string;
	location?: string;
}

interface AuthContextType {
	user: User | null;
	loading: boolean;
	login: (token: string, userData: User) => void;
	updateUserContext: (newData: Partial<User>) => void;
	logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				try {
					const userDocRef = doc(db, "users", firebaseUser.uid);
					const userDocSnap = await getDoc(userDocRef);

					if (userDocSnap.exists()) {
						const firestoreData = userDocSnap.data();
						setUser({
							id: firebaseUser.uid,
							name: firestoreData.name || firebaseUser.displayName || "Pengguna",
							email: firestoreData.email || firebaseUser.email || "",
							username: firestoreData.username || "",
							birthDate: firestoreData.birthDate || "",
							status: firestoreData.status || "",
							field: firestoreData.field || "",
							location: firestoreData.location || "",
						});
					} else {
						setUser({
							id: firebaseUser.uid,
							name: firebaseUser.displayName || "Pengguna",
							email: firebaseUser.email || "",
							username: "",
						});
					}
				} catch (err) {
					console.error("Gagal sinkronisasi data sesi:", err);
					setUser(null);
				}
			} else {
				setUser(null);
			}
			setLoading(false);
		});

		return () => unsubscribe();
	}, []);

	const login = (token: string, userData: User) => setUser(userData);

	const updateUserContext = (newData: Partial<User>) => {
		setUser((prev) => (prev ? { ...prev, ...newData } : null));
	};

	const logout = async () => {
		try {
			await signOut(auth);
			setUser(null);
			window.location.href = "/login";
		} catch (error) {
			console.error("Gagal logout:", error);
		}
	};

	return <AuthContext.Provider value={{ user, loading, login, updateUserContext, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuth must be used within AuthProvider");
	return context;
};
