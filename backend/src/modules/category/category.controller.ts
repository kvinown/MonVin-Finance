import { Request, Response } from "express";
import { CategoryService } from "./category.service";
import { CategoryType } from "@prisma/client";

export class CategoryController {
	// Handler untuk POST /api/categories
	static async create(req: Request, res: Response): Promise<void> {
		try {
			const { name, type } = req.body;

			if (!name || !type) {
				res.status(400).json({ success: false, message: "Kolom name dan type wajib diisi" });
				return;
			}

			const newCategory = await CategoryService.createCategory(name, type);
			res.status(201).json({
				success: true,
				message: "Kategori global berhasil ditambahkan",
				data: newCategory,
			});
		} catch (error: any) {
			res.status(400).json({ success: false, message: error.message });
		}
	}

	// Handler untuk GET /api/categories
	static async getCategories(req: Request, res: Response): Promise<void> {
		try {
			// Mengambil filter type dari query string URL, misal: ?type=EXPENSE
			const { type } = req.query;

			const categories = await CategoryService.getAllCategories(type as CategoryType);
			res.status(200).json({ success: true, data: categories });
		} catch (error: any) {
			res.status(500).json({ success: false, message: error.message });
		}
	}
}
