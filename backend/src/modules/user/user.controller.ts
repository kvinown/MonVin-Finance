import { Request, Response } from "express";
import { UserService } from "./user.service";

export class UserController {
	static async register(req: Request, res: Response): Promise<void> {
		try {
			const { name, username, email, password } = req.body;

			if (!name || !username || !email || !password) {
				res.status(400).json({ success: false, message: "Semua kolom wajib diisi" });
				return;
			}

			const newUser = await UserService.registerUser(name, username, email, password);

			res.status(201).json({
				success: true,
				message: "Registrasi akun MonVin berhasil",
				data: { id: newUser.id, name: newUser.name, username: newUser.username, email: newUser.email },
			});
		} catch (error: any) {
			res.status(400).json({ success: false, message: error.message });
		}
	}

	static async login(req: Request, res: Response): Promise<void> {
		try {
			const { identifier, password } = req.body;

			if (!identifier || !password) {
				res.status(400).json({ success: false, message: "Kolom login dan password wajib diisi" });
				return;
			}

			const result = await UserService.loginUser(identifier, password);

			res.status(200).json({
				success: true,
				message: "Login berhasil! Selamat datang kembali",
				token: result.token,
				data: { id: result.user.id, name: result.user.name, username: result.user.username, email: result.user.email },
			});
		} catch (error: any) {
			res.status(401).json({ success: false, message: error.message });
		}
	}

	static async checkUsername(req: Request, res: Response): Promise<void> {
		try {
			const { username } = req.body;

			if (!username) {
				res.status(400).json({ success: false, message: "Kolom username wajib diisi" });
				return;
			}

			const isAvailable = await UserService.checkUsernameAvailability(username);

			if (isAvailable) {
				res.status(200).json({
					success: true,
					available: true,
					message: "Username tersedia dan bisa digunakan",
				});
			} else {
				res.status(200).json({
					success: true,
					available: false,
					message: "Username sudah digunakan",
				});
			}
		} catch (error: any) {
			res.status(500).json({ success: false, message: "Gagal mengecek username" });
		}
	}
	static async getMe(req: Request, res: Response): Promise<void> {
		try {
			const userId = (req as any).user.id; // Diambil aman dari token dekripsi JWT
			const user = await UserService.getUserById(userId);

			res.status(200).json({ success: true, data: user });
		} catch (error: any) {
			res.status(404).json({ success: false, message: error.message });
		}
	}
}
