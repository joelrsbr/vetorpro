import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import LoginAndPlansPage from "./pages/LoginAndPlansPage";
import Index from "./pages/Index";
import Precos from "./pages/Precos";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Business from "./pages/Business";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SessionProvider>
        <BusinessProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LoginAndPlansPage />} />
                <Route path="/loginandplans" element={<LoginAndPlansPage />} />
                <Route path="/home" element={<Index />} />
                <Route path="/precos" element={<Precos />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/business" element={<Business />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </BusinessProvider>
      </SessionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
