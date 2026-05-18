import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import API from "../services/api";
import { AuthLayout } from "../layouts/AuthLayout";

export const LoginPage: React.FC = () => {
	const { login } = useAuth();
	const navigate = useNavigate();

	const [identifier, setIdentifier] = useState("");
	const [password, setPassword] = useState("");
	const [errorMsg, setErrorMsg] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMsg("");
		if (!identifier || !password) return setErrorMsg("Semua kolom wajib diisi.");

		setIsLoading(true);
		try {
			const res = await API.post("/users/login", { identifier, password });

			// Ambil token langsung dari luar, dan user dari dalam 'data'
			const token = res.data.token;
			const user = res.data.data;

			if (!token || !user) {
				throw new Error("Struktur token/user tidak ditemukan dari backend");
			}

			login(token, user);
			navigate("/dashboard");
		} catch (err: any) {
			// 🔥 Munculkan error asli ke layar agar kita tahu salahnya di mana
			console.error("ERROR LOGIN:", err);
			setErrorMsg(err.message || "Gagal masuk ke sistem.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthLayout title="Selamat Datang Kembali">
			{errorMsg && <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg tracking-wide mb-4">{errorMsg}</div>}

			<form
				onSubmit={handleSubmit}
				className="space-y-5">
				<div>
					<label className="label-base">Email atau Username</label>
					<input
						type="text"
						className="input-base"
						value={identifier}
						onChange={(e) => setIdentifier(e.target.value)}
						disabled={isLoading}
					/>
				</div>

				<div>
					<label className="label-base mb-0">Kata Sandi</label>
					<input
						type="password"
						className="input-base mt-1.5"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						disabled={isLoading}
					/>
				</div>

				<button
					type="submit"
					className="btn-slate-primary flex items-center justify-center h-10"
					disabled={isLoading}>
					{isLoading ? <div className="h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div> : "Masuk ke Dasbor"}
				</button>
			</form>

			<div className="text-center text-xs text-slate-500 tracking-wide mt-6">
				Belum memiliki akun?{" "}
				<Link
					to="/register"
					className="font-semibold text-slate-900 dark:text-slate-100 hover:underline">
					Daftar Sekarang
				</Link>
			</div>
		</AuthLayout>
	);
};
