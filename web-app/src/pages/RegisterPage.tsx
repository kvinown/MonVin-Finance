import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";
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

	// Fitur Check Username API
	// Fitur Check Username API
	const handleCheckUsername = async () => {
		if (!username) {
			setUsernameStatus({ available: false, message: "Username tidak boleh kosong." });
			return;
		}

		setIsCheckingUsername(true);
		setUsernameStatus(null);
		try {
			const res = await API.post("/users/check-username", { username });

			// Menggunakan '?.' (Optional Chaining) agar aman dari error 'undefined'
			// Jika res.data.data.available tidak ada, kita asumsikan true (karena masuk blok sukses 200 OK)
			const isAvailable = res.data?.data?.available ?? true;

			setUsernameStatus({
				available: isAvailable,
				message: res.data?.message || `Username '${username}' tersedia.`,
			});
		} catch (err: any) {
			// Jika backend melempar error (username sudah terpakai / 400 Bad Request)
			// Kita set pesannya menjadi Username {username} Not Available
			setUsernameStatus({
				available: false,
				message: err.message || `Username '${username}' Not Available.`,
			});
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
			await API.post("/users/register", { name, email, username, password });
			// Langsung arahkan ke login setelah sukses
			navigate("/login");
		} catch (err: any) {
			setErrorMsg(err.message || "Gagal mendaftarkan akun.");
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
								setUsernameStatus(null); // Reset status saat user mengetik ulang
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
					{/* Feedback Label Username */}
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
					className="btn-slate-primary mt-4 h-10 flex items-center justify-center"
					disabled={isLoading}>
					{isLoading ? <div className="h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div> : "Daftar Akun"}
				</button>
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
