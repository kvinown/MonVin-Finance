import prisma from "../../config/db";
import { CategoryType } from "@prisma/client";

export class CategoryService {
	// 1. Membuat Kategori Global Baru
	static async createCategory(name: string, type: CategoryType) {
		// Pengecekan duplikasi kategori global
		const existingCategory = await prisma.category.findFirst({
			where: { name, type },
		});
		if (existingCategory) throw new Error(`Kategori '${name}' untuk tipe ${type} sudah ada`);

		return await prisma.category.create({
			data: { name, type },
		});
	}

	// 2. Mengambil Semua Kategori Global (Bisa difilter INCOME / EXPENSE)
	static async getAllCategories(type?: CategoryType) {
		return await prisma.category.findMany({
			where: {
				...(type && { type }),
				isActive: true,
			},
			orderBy: { name: "asc" },
		});
	}
}
