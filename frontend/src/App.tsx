import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import LandingPage from "./pages/LandingPage";
import Pipeline from "./pages/Pipeline";
import MonitoringPage from "./pages/MonitoringPage";
import DataManagement from "./pages/DataManagement";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Importar funções de debug (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  import("@/utils/debugHelpers");
  import("@/utils/forceRealAPI");
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Landing page without navbar */}
            <Route path="/landing" element={<LandingPage />} />

            {/* Authentication page */}
            <Route
              path="/auth"
              element={
                <ProtectedRoute requireAuth={false}>
                  <AuthPage />
                </ProtectedRoute>
              }
            />

            {/* Redirect root to pipeline (main platform) */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Navigate to="/pipeline" replace />
                </ProtectedRoute>
              }
            />

            {/* Protected pages with navbar - Pipeline as main page */}
            <Route
              path="/pipeline"
              element={
                <ProtectedRoute>
                  <Layout><Pipeline /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/monitoring"
              element={
                <ProtectedRoute>
                  <Layout><MonitoringPage /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/data"
              element={
                <ProtectedRoute>
                  <Layout><DataManagement /></Layout>
                </ProtectedRoute>
              }
            />

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
