import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class GeminiService {
	/**
	 * Menganalisis teks nota dengan konteks daftar wallet milik user
	 * @param rawText Contoh: "Bayar seblak pake gopay 15rb"
	 * @param wallets Daftar wallet asli dari database user
	 */
	static async parseTransactionText(rawText: string, wallets: any[]) {
		try {
			// Ubah array objek wallet menjadi teks ringkas agar dipahami Gemini
			const walletContext = wallets.map((w) => `- ID: ${w.id}, Nama: ${w.name}, Tipe: ${w.type}`).join("\n");

			const prompt = `
                Kamu adalah asisten AI finansial pintar untuk MonVin Finance.
                Tugasmu adalah menganalisis teks transaksi mentah dan mencocokkannya dengan daftar Dompet (Wallet) milik user berikut ini:
                
                Daftar Dompet User yang Tersedia:
                ${walletContext}

                Kriteria Analisis:
                1. 'amount': Total nominal dalam angka murni (integer).
                2. 'note': Ringkasan catatan singkat (maksimal 5 kata).
                3. 'type': 'EXPENSE' (pengeluaran) atau 'INCOME' (pemasukan).
                4. 'walletId': Cari ID Dompet dari daftar di atas yang paling cocok dengan teks pengguna (misal kata kunci "gopay" cocok dengan E-WALLET/GoPay, "bca/transfer" cocok dengan BANK/BCA, "tunai/cash" cocok dengan CASH). Jika tidak ada kata kunci dompet yang disebutkan, pilih ID Dompet yang tipenya 'CASH' atau dompet utama sebagai default.

                Format JSON yang WAJIB kamu kembalikan harus terstruktur seperti ini:
                {
                    "amount": 15000,
                    "note": "Beli seblak",
                    "type": "EXPENSE",
                    "walletId": "ID-wallet-yang-paling-cocok-dari-daftar"
                }

                Teks Pengguna: "${rawText}"
            `;

			const response = await ai.models.generateContent({
				model: "gemini-2.5-flash",
				contents: prompt,
				config: {
					responseMimeType: "application/json",
				},
			});

			const responseText = response.text;
			if (!responseText) throw new Error("Gemini tidak memberikan respons.");

			return JSON.parse(responseText);
		} catch (error: any) {
			console.error("Gemini AI Error:", error);
			throw new Error("Gagal memproses analisis AI: " + error.message);
		}
	}
	static async analyzeFinancialData(income: number, expense: number, balance: number) {
		try {
			const prompt = `
                Kamu adalah penasihat keuangan untuk pengguna aplikasi MonVin Finance.
                Berikut adalah ringkasan keuangan bulan ini:
                - Pemasukan: Rp${income}
                - Pengeluaran: Rp${expense}
                - Sisa Saldo: Rp${balance}

                Berikan analisis singkat (maksimal 3 paragraf pendek) mengenai rasio pengeluaran terhadap pemasukan ini. 
                Fokuskan jawabanmu pada 1-2 saran praktis dan spesifik tentang bagaimana cara agar pengeluarannya bisa lebih dihemat lagi untuk bulan depan.
            `;

			const response = await ai.models.generateContent({
				model: "gemini-2.5-flash",
				contents: prompt,
			});

			return response.text || "Terus pantau keuanganmu dengan baik!";
		} catch (error: any) {
			console.error("Gemini Analysis Error:", error);
			throw new Error("Gagal mengambil insight AI saat ini.");
		}
	}
}
