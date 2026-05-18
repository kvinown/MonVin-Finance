import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";

// Menambahkan interface khusus agar TypeScript mengenali req.user
export interface AuthRequest extends Request {
	user?: any;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
	try {
		// Mengambil token dari header 'Authorization: Bearer <token>'
		const authHeader = req.header("Authorization");

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			res.status(401).json({ success: false, message: "Akses ditolak. Token tidak ditemukan." });
			return;
		}

		const token = authHeader.split(" ")[1];

		// Verifikasi keaslian token
		const decoded = jwt.verify(token, JWT_SECRET);

		// Menyimpan data user (id, email, username) ke dalam req.user agar bisa dipakai di Controller
		req.user = decoded;

		// Lanjut ke controller berikutnya
		next();
	} catch (error) {
		res.status(403).json({ success: false, message: "Token tidak valid atau sudah kedaluwarsa." });
	}
};
