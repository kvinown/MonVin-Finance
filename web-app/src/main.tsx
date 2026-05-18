import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ThemeProvider>
			<ToastProvider>
				{" "}
				{/* 🔥 Bungkus aplikasinya */}
				<App />
			</ToastProvider>
		</ThemeProvider>
	</React.StrictMode>,
);
