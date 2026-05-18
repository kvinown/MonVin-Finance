import prisma from "../../config/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";

export class UserService {
	// REGISTER USER
	static async registerUser(name: string, username: string, email: string, password: string) {
		const existingEmail = await prisma.user.findUnique({ where: { email } });
		if (existingEmail) throw new Error("Email sudah terdaftar");

		const existingUsername = await prisma.user.findUnique({ where: { username } });
		if (existingUsername) throw new Error("Username sudah digunakan");

		const passwordHash = await bcrypt.hash(password, 10);

		return await prisma.user.create({
			data: { name, username, email, passwordHash },
		});
	}

	// LOGIN USER
	static async loginUser(identifier: string, password: string) {
		const user = await prisma.user.findFirst({
			where: {
				OR: [{ email: identifier }, { username: identifier }],
			},
		});

		if (!user) throw new Error("Akun tidak ditemukan atau password salah");

		const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
		if (!isPasswordValid) throw new Error("Akun tidak ditemukan atau password salah");

		const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, {
			expiresIn: "7d",
		});

		return { user, token };
	}

	// CHECK USERNAME AVAILABILITY
	static async checkUsernameAvailability(username: string): Promise<boolean> {
		const user = await prisma.user.findUnique({
			where: { username },
		});
		return user === null;
	}
	static async getUserById(id: string) {
		const user = await prisma.user.findUnique({
			where: { id, isActive: true },
			select: {
				id: true,
				name: true,
				username: true,
				email: true,
				createdAt: true,
			},
		});
		if (!user) throw new Error("Pengguna tidak ditemukan atau sudah dinonaktifkan");
		return user;
	}
}
