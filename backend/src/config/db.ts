import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Mengeksekusi koneksi saat server pertama kali diangkat
prisma
	.$connect()
	.then(() => console.log("Prisma Client connected to PostgreSQL successfully"))
	.catch((err) => console.error("Database connection error:", err));

export default prisma;
