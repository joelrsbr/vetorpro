import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { SimulationProvider } from "@/contexts/SimulationContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import LoginAndPlansPage from "./pages/LoginAndPlansPage";
import Index from "./pages/Index";
import Precos from "./pages/Precos";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Business from "./pages/Business";
import NotFound from "./pages/NotFound";
import TermosDeUso from "./pages/TermosDeUso";
import PoliticaDePrivacidade from "./pages/PoliticaDePrivacidade";

const queryClient = new QueryClient();

function RedirectRouteRestorer() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect");

    if (!redirect || location.pathname !== "/") {
      return;
    }

    navigate(redirect, { replace: true });
  }, [location.pathname, location.search, navigate]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SessionProvider>
        <BusinessProvider>
          <SimulationProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <RedirectRouteRestorer />
                <Routes>
                  <Route path="/" element={<LoginAndPlansPage />} />
                  <Route path="/loginandplans" element={<LoginAndPlansPage />} />
                  <Route path="/precos" element={<Precos />} />
                  <Route path="/login" element={<Login />} />

                  <Route path="/termos-de-uso" element={<TermosDeUso />} />
                  <Route path="/politica-de-privacidade" element={<PoliticaDePrivacidade />} />

                  {/* Rotas protegidas - requerem autenticação e assinatura ativa */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/calculadora" element={<Index />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/business" element={<Business />} />
                  </Route>

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </SimulationProvider>
        </BusinessProvider>
      </SessionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

