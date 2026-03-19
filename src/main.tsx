import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { clearLegacyCache } from "./lib/clearLegacyCache";

void clearLegacyCache();

createRoot(document.getElementById("root")!).render(<App />);
