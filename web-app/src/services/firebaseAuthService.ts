import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	updateProfile,
	signOut,
	GoogleAuthProvider, // Tambahan
	signInWithPopup, // Tambahan
} from "firebase/auth";
import {
	doc,
	setDoc,
	collection,
	query,
	where,
	getDocs,
	getDoc, // <--- PASTIKAN INI ADA
} from "firebase/firestore";
import { auth, db } from "../config/firebase";

// Inisialisasi Provider Google
const googleProvider = new GoogleAuthProvider()

export const firebaseAuthService = {
	// 1. Cek Ketersediaan Username
	checkUsername: async (username: string) => {
		try {
			const usersRef = collection(db, "users");
			const q = query(usersRef, where("username", "==", username));
			const querySnapshot = await getDocs(q);
			return { available: querySnapshot.empty }; // True jika kosong (belum terpakai)
		} catch (error: any) {
			return { available: false, message: error.message };
		}
	},

	// 2. Registrasi (Dengan Username Manual)
	register: async (name: string, email: string, username: string, password: string) => {
		try {
			const userCredential = await createUserWithEmailAndPassword(auth, email, password);
			const user = userCredential.user;

			await updateProfile(user, { displayName: name });

			// Simpan data lengkap ke Firestore sesuai skema Prisma lama
			await setDoc(doc(db, "users", user.uid), {
				id: user.uid,
				email: email,
				username: username,
				name: name,
				isActive: true,
				theme: "DARK",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});

			return { success: true, user };
		} catch (error: any) {
			return { success: false, message: error.message };
		}
	},

	// 3. Login (Bisa pakai Email ATAU Username)
	login: async (identifier: string, password: string) => {
		try {
			let loginEmail = identifier;

			// Jika identifier TIDAK mengandung '@', berarti itu adalah username
			if (!identifier.includes("@")) {
				const usersRef = collection(db, "users");
				const q = query(usersRef, where("username", "==", identifier));
				const querySnapshot = await getDocs(q);

				if (querySnapshot.empty) {
					return { success: false, message: "Username tidak ditemukan." };
				}
				// Ambil email asli dari dokumen user yang ditemukan
				loginEmail = querySnapshot.docs[0].data().email;
			}

			// Lakukan login menggunakan email
			const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
			return { success: true, user: userCredential.user };
		} catch (error: any) {
			return { success: false, message: "Email/Username atau kata sandi salah." };
		}
	},

	// 4. Logout
	logout: async () => {
		await signOut(auth);
	},

	// FUNGSI BARU: Otentikasi dengan Google
	loginWithGoogle: async () => {
		try {
			// Membuka popup Google Sign-In
			const result = await signInWithPopup(auth, googleProvider);
			const user = result.user;

			// Cek apakah user ini sudah ada di database Firestore kita?
			const userDocRef = doc(db, "users", user.uid);
			const userDocSnap = await getDoc(userDocRef);

			// Jika TIDAK ADA, berarti dia BARU PERTAMA KALI mendaftar via Google
			if (!userDocSnap.exists()) {
				// Generate username dari email (misal: kevin.owen@gmail.com -> kevin.owen_284)
				const baseEmail = user.email ? user.email.split("@")[0].toLowerCase() : "user";
				const randomSuffix = Math.floor(Math.random() * 1000);
				const generatedUsername = `${baseEmail}_${randomSuffix}`;

				// Simpan data ke Firestore
				await setDoc(userDocRef, {
					id: user.uid,
					email: user.email,
					username: generatedUsername,
					name: user.displayName || "Pengguna Google",
					isActive: true,
					theme: "DARK",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				});
			}

			return { success: true, user };
		} catch (error: any) {
			console.error("Google Auth Error:", error);
			// Menangani error jika popup ditutup sebelum selesai
			if (error.code === "auth/popup-closed-by-user") {
				return { success: false, message: "Proses login Google dibatalkan." };
			}
			return { success: false, message: "Gagal menghubungkan dengan Google." };
		}
	},
};
