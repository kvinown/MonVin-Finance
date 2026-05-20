import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { firebaseAuthService } from "../services/firebaseAuthService";
import { AuthLayout } from "../layouts/AuthLayout";

export const RegisterPage: React.FC = () => {
	const navigate = useNavigate();

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");

	const [isCheckingUsername, setIsCheckingUsername] = useState(false);
	const [usernameStatus, setUsernameStatus] = useState<{ available?: boolean; message: string } | null>(null);

	const [errorMsg, setErrorMsg] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleCheckUsername = async () => {
		if (!username) {
			setUsernameStatus({ available: false, message: "Username tidak boleh kosong." });
			return;
		}

		setIsCheckingUsername(true);
		setUsernameStatus(null);
		try {
			const res = await firebaseAuthService.checkUsername(username);

			setUsernameStatus({
				available: res.available,
				message: res.available ? `Username '${username}' tersedia.` : `Username '${username}' sudah terpakai.`,
			});
		} catch (err: any) {
			setUsernameStatus({ available: false, message: "Gagal mengecek ketersediaan username." });
		} finally {
			setIsCheckingUsername(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMsg("");

		if (!name || !email || !username || !password) {
			return setErrorMsg("Semua kolom wajib diisi.");
		}
		if (usernameStatus?.available === false) {
			return setErrorMsg("Gunakan username yang tersedia sebelum mendaftar.");
		}

		setIsLoading(true);
		try {
			// Panggil Firebase Service
			const res = await firebaseAuthService.register(name, email, username, password);

			if (res.success) {
				navigate("/dsahboard");
			} else {
				setErrorMsg(res.message || "Gagal mendaftarkan akun.");
			}
		} catch (err: any) {
			setErrorMsg(err.message || "Terjadi kesalahan sistem.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoogleAuth = async () => {
		setIsLoading(true);
		setErrorMsg("");
		try {
			const res = await firebaseAuthService.loginWithGoogle();
			if (res.success) {
				navigate("/dashboard"); // Langsung ke dashboard, AuthContext akan otomatis mendeteksi
			} else {
				setErrorMsg(res.message || "Otentikasi Google gagal.");
			}
		} catch (err) {
			setErrorMsg("Terjadi kesalahan pada server Google.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthLayout
			title="Registrasi Akun Baru"
			subtitle="Bergabunglah untuk memulai efisiensi finansial Anda.">
			{errorMsg && <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg tracking-wide mb-4">{errorMsg}</div>}

			<form
				onSubmit={handleSubmit}
				className="space-y-4">
				<div>
					<label className="label-base">Nama Lengkap</label>
					<input
						type="text"
						className="input-base"
						value={name}
						onChange={(e) => setName(e.target.value)}
						disabled={isLoading}
					/>
				</div>

				<div>
					<label className="label-base">Alamat Email</label>
					<input
						type="email"
						className="input-base"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						disabled={isLoading}
					/>
				</div>

				<div>
					<label className="label-base">Username</label>
					<div className="flex gap-2">
						<input
							type="text"
							className="input-base flex-1"
							value={username}
							onChange={(e) => {
								setUsername(e.target.value.toLowerCase());
								setUsernameStatus(null);
							}}
							disabled={isLoading}
						/>
						<button
							type="button"
							onClick={handleCheckUsername}
							disabled={isCheckingUsername || !username || isLoading}
							className="px-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors">
							{isCheckingUsername ? "..." : "Cek"}
						</button>
					</div>
					{usernameStatus && <div className={`text-xs mt-1 font-medium tracking-wide ${usernameStatus.available ? "text-green-600" : "text-red-600"}`}>{usernameStatus.message}</div>}
				</div>

				<div>
					<label className="label-base">Kata Sandi</label>
					<input
						type="password"
						className="input-base"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						disabled={isLoading}
					/>
				</div>

				<button
					type="submit"
					className="btn-slate-primary mt-4 h-10 flex items-center justify-center w-full"
					disabled={isLoading}>
					{isLoading ? <div className="h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div> : "Daftar Akun"}
				</button>
				{/* --- AWAL SECTION PROVIDER LAIN --- */}
				<div className="relative flex items-center py-5">
					<div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
					<span className="shrink-0 px-4 text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wide uppercase">Atau daftar menggunakan</span>
					<div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
				</div>

				<button
					type="button"
					onClick={handleGoogleAuth}
					disabled={isLoading}
					className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 text-sm font-medium disabled:opacity-50">
					<svg
						className="w-5 h-5"
						viewBox="0 0 24 24">
						<path
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							fill="#4285F4"
						/>
						<path
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							fill="#34A853"
						/>
						<path
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							fill="#FBBC05"
						/>
						<path
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							fill="#EA4335"
						/>
					</svg>
					Google
				</button>
				{/* --- AKHIR SECTION PROVIDER LAIN --- */}
			</form>

			<div className="text-center text-xs text-slate-500 tracking-wide mt-6">
				Sudah memiliki akun?{" "}
				<Link
					to="/login"
					className="font-semibold text-slate-900 dark:text-slate-100 hover:underline">
					Masuk di sini
				</Link>
			</div>
		</AuthLayout>
	);
};
