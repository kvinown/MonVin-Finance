import express from "express";
import cors from "cors";
import userRoute from "./modules/user/user.route";
import walletRoute from "./modules/wallet/wallet.route";
import transactionRoute from "./modules/transaction/transaction.route";
import categoryRoute from "./modules/category/category.route";
import geminiRoute from "./modules/gemini/gemini.route";
import dashboardRoute from "./modules/dashboard/dashboard.route";

const app = express();

app.use(cors());
app.use(express.json());

// Registrasi Base Route Modular
app.use("/api/users", userRoute);
app.use("/api/wallets", walletRoute);
app.use("/api/transactions", transactionRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/gemini", geminiRoute);
app.use("/api/dashboard", dashboardRoute);


// Base Route

app.get("/", (req, res) => {
	res.status(200).json({ status: "OK", message: "MonVin Finance API is running smoothly." });
});

export default app;
