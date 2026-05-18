import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { MainLayout } from "./layouts/MainLayout";

import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { WalletPage } from "./pages/WalletPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { ProfilePage } from "./pages/ProfilePage"; // 🔥 Import Profile
import { NotFoundPage } from "./pages/NotFoundPage"; // 🔥 Import 404

function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<Routes>
					{/* Jalur Publik */}
					<Route
						path="/login"
						element={<LoginPage />}
					/>
					<Route
						path="/register"
						element={<RegisterPage />}
					/>
					{/* Jalur Privat dengan Layout Bersama */}
					<Route element={<ProtectedRoute />}>
						<Route element={<MainLayout />}>
							<Route
								path="/dashboard"
								element={<DashboardPage />}
							/>
							<Route
								path="/wallets"
								element={<WalletPage />}
							/>
							<Route
								path="/transactions"
								element={<TransactionsPage />}
							/>
							<Route
								path="/profile"
								element={<ProfilePage />}
							/>{" "}
							{/* 🔥 Pasang Rute Profil */}
						</Route>
					</Route>
					{/* Fallback Route (404) ditempatkan di luar layout agar fullscreen */}
					<Route
						path="/"
						element={
							<Navigate
								to="/dashboard"
								replace
							/>
						}
					/>
					<Route
						path="*"
						element={<NotFoundPage />}
					/>{" "}
					{/* 🔥 Pasang Rute 404 */}
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	);
}

export default App;
