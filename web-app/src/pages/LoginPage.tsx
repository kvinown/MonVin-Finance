import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { firebaseAuthService } from "../services/firebaseAuthService";
import { AuthLayout } from "../layouts/AuthLayout";
import { Modal } from "../components/Modal"; // Import Modal kamu

export const LoginPage: React.FC = () => {
	const { login } = useAuth();
	const { showToast } = useToast();
	const navigate = useNavigate();

	const [identifier, setIdentifier] = useState("");
	const [password, setPassword] = useState("");
	const [errorMsg, setErrorMsg] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// States untuk Modal Lupa Password
	const [isResetModalOpen, setIsResetModalOpen] = useState(false);
	const [resetEmail, setResetEmail] = useState("");
	const [isSendingReset, setIsSendingReset] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMsg("");
		if (!identifier || !password) return setErrorMsg("Semua kolom wajib diisi.");

		setIsLoading(true);
		try {
			const res = await firebaseAuthService.login(identifier, password);

			if (res.success && res.user) {
				const token = await res.user.getIdToken();
				const userData = {
					id: res.user.uid,
					name: res.user.displayName || "Pengguna",
					email: res.user.email || "",
					username: identifier,
				};

				login(token, userData);
				navigate("/dashboard");
			} else {
				setErrorMsg(res.message || "Gagal masuk ke sistem.");
			}
		} catch (err: any) {
			console.error("ERROR LOGIN:", err);
			setErrorMsg("Gagal masuk ke sistem. Periksa kembali kredensial Anda.");
		} finally {
			setIsLoading(false);
		}
	};

	// Fungsi eksekusi kirim email reset password
	const handleResetPasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!resetEmail) return;

		setIsSendingReset(true);
		const res = await firebaseAuthService.resetPassword(resetEmail);
		setIsSendingReset(false);

		if (res.success) {
			showToast(res.message, "success");
			setIsResetModalOpen(false);
			setResetEmail("");
		} else {
			showToast(res.message, "error");
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
					<div className="flex justify-between items-center">
						<label className="label-base mb-0">Kata Sandi</label>
						{/* Tombol pemicu Modal Lupa Password */}
						<button
							type="button"
							onClick={() => setIsResetModalOpen(true)}
							className="text-xs font-semibold text-blue-600 hover:underline focus:outline-none">
							Lupa kata sandi?
						</button>
					</div>
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
					className="btn-slate-primary flex items-center justify-center h-10 w-full"
					disabled={isLoading}>
					{isLoading ? <div className="h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div> : "Masuk ke Dasbor"}
				</button>
			</form>

			{/* --- SECTION PROVIDER GOOGLE LOG-IN --- */}
			<div className="relative flex items-center py-5">
				<div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
				<span className="shrink-0 px-4 text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wide uppercase">Atau masuk menggunakan</span>
				<div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
			</div>

			<button
				type="button"
				onClick={async () => {
					setIsLoading(true);
					try {
						const res = await firebaseAuthService.loginWithGoogle();
						if (res.success && res.user) {
							const token = await res.user.getIdToken();
							login(token, {
								id: res.user.uid,
								name: res.user.displayName || "Pengguna",
								email: res.user.email || "",
								username: "",
							});
							navigate("/dashboard");
						} else {
							showToast(res.message || "Otentikasi Google gagal.", "error");
						}
					} catch (err) {
						showToast("Terjadi kesalahan sistem Google.", "error");
					} finally {
						setIsLoading(false);
					}
				}}
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

			<div className="text-center text-xs text-slate-500 tracking-wide mt-6">
				Belum memiliki akun?{" "}
				<Link
					to="/register"
					className="font-semibold text-slate-900 dark:text-slate-100 hover:underline">
					Daftar Sekarang
				</Link>
			</div>

			{/* MODAL LUPA PASSWORD */}
			<Modal
				isOpen={isResetModalOpen}
				onClose={() => setIsResetModalOpen(false)}
				title="Reset Kata Sandi Akun">
				<form
					onSubmit={handleResetPasswordSubmit}
					className="space-y-4">
					<p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Masukkan alamat email terdaftar Anda. Kami akan mengirimkan tautan resmi dari sistem Firebase untuk mengatur ulang atau membuat kata sandi baru.</p>
					<div>
						<label className="label-base">Alamat Email</label>
						<input
							type="email"
							required
							placeholder="nama@email.com"
							className="input-base mt-1"
							value={resetEmail}
							onChange={(e) => setResetEmail(e.target.value)}
							disabled={isSendingReset}
						/>
					</div>
					<div className="pt-2">
						<button
							type="submit"
							className="btn-slate-primary h-10 flex items-center justify-center w-full"
							disabled={isSendingReset || !resetEmail}>
							{isSendingReset ? "Mengirim Tautan..." : "Kirim Email Pemulihan"}
						</button>
					</div>
				</form>
			</Modal>
		</AuthLayout>
	);
};
