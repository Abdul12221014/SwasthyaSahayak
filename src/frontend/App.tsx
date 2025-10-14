import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import Index from "./pages/Index";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

// Safe Mode Detection
const isSafe =
  new URLSearchParams(window.location.search).has("safe") ||
  import.meta.env.VITE_SAFE_MODE === "true";

// Safe Mode Component
function SafeApp() {
  const Diagnostics = require("./components/admin/Diagnostics").default;
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-3">Safe Mode</h1>
      <Diagnostics />
      <a className="text-blue-600 underline block mt-3" href="/admin">Go to Admin</a>
    </div>
  );
}

// Main App Routes
function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/admin" element={<Admin />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

// Main App Component with Error Boundary
const App = () => {
  return (
    <ErrorBoundary>
      {isSafe ? <SafeApp /> : <AppRoutes />}
    </ErrorBoundary>
  );
};

export default App;