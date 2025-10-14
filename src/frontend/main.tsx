import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { debug } from "@/frontend/lib/logger";

debug("Router init");

createRoot(document.getElementById("root")!).render(<App />);

