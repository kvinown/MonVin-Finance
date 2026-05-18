import axios from "axios";

// Konfigurasi base URL server backend
const API = axios.create({
	baseURL: "http://localhost:5000/api",
	timeout: 10000,
	headers: {
		"Content-Type": "application/json",
	},
});

// 1. REQUEST INTERCEPTOR: Otomatis sisipkan Token JWT jika tersedia
API.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem("token");
		if (token && config.headers) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

// 2. RESPONSE INTERCEPTOR: Pusat kendali error sesuai kontrak HTTP Status Code
API.interceptors.response.use(
	(response) => response,
	(error) => {
		// Tangkap format error dari backend atau fallback ke pesan default
		const errorResponse = error.response?.data || {
			status: "error",
			message: "Terjadi kesalahan pada server atau jaringan.",
		};

		if (error.response) {
			const statusCode = error.response.status;

			switch (statusCode) {
				case 401:
					// Unauthorized: Bersihkan session dan tendang ke halaman login
					localStorage.removeItem("token");
					localStorage.removeItem("user");
					// Menggunakan window.location sebagai fallback jika di luar komponen router
					if (window.location.pathname !== "/login") {
						window.location.href = "/login";
					}
					break;

				case 403:
					// Forbidden: User tidak memiliki hak akses
					console.warn("Akses ditolak: 403 Forbidden");
					break;

				case 404:
					// Not Found: Resource tidak ditemukan
					console.warn("Resource tidak ditemukan: 404 Not Found");
					break;

				case 400:
					// Bad Request: Validasi gagal
					console.warn("Bad Request: 400", errorResponse.message);
					break;

				default:
					console.error(`HTTP Error ${statusCode}:`, errorResponse.message);
			}
		}

		// Kembalikan objek error yang seragam agar mudah di-catch di komponen UI
		return Promise.reject(errorResponse);
	},
);

export default API;
