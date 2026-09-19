import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import DashboardLayout from "./components/DashboardLayout";
import DashboardOverview from "./pages/DashboardOverview";
import Investments from "./pages/Investments";
import GoalSimulation from "./pages/GoalSimulation";
import SettingsPage from "./pages/Settings";
import FinanceEducation from "./pages/FinanceEducation";
import NotFound from "./pages/NotFound";
import RetirementPlanning from "./pages/RetirementPlanning";
import Games from "./pages/Games";
import { useStore } from "./store/useStore";
import { getMeRequest } from "./lib/authApi";
import ChatBot from "./components/ChatBot";
import { Loader2 } from "lucide-react";
import RetirementOnboarding from "./components/dashboard/RetirementOnboarding";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { isAuthenticated, authToken, hydrateAuth, login, logout, isHydrated } = useStore();

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    const validateToken = async () => {
      if (!authToken) {
        return;
      }

      try {
        const user = await getMeRequest(authToken);
        login(user, authToken);
      } catch {
        logout();
      }
    };

    validateToken();
  }, [authToken, login, logout]);

  if (!isHydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/auth" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Auth />} />

      <Route
        path="/onboarding"
        element={isAuthenticated ? <Onboarding /> : <Navigate to="/auth" replace />}
      />

      <Route
        path="/dashboard"
        element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/auth" replace />}
      >
        <Route index element={<DashboardOverview />} />
        <Route path="investments" element={<Investments />} />
        <Route path="simulation" element={<GoalSimulation />} />
        <Route path="education" element={<FinanceEducation />} />
        <Route path="games" element={<Games />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="retirement" element={<RetirementPlanning />} />

      </Route>
      {/* <Route path="retirement" element={<RetirementPlanning />} /> */}

      {/* <Route path="retirement" element={<RetirementOnboarding />} /> */}

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
        <ChatBot />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;