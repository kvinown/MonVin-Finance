import app from "./app";
import dotenv from "dotenv";

// Load Environment Variables sebelum server diangkat
dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(`=============================================`);
	console.log(` Server MonVin Finance berjalan di port ${PORT}`);
	console.log(` URL Lokal: http://localhost:${PORT}`);
	console.log(`=============================================`);
});
