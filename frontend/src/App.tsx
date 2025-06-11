import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Pipeline from "./pages/Pipeline";
import MonitoringPage from "./pages/MonitoringPage";
import DataManagement from "./pages/DataManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Landing page without navbar */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Pages with navbar */}
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/pipeline" element={<Layout><Pipeline /></Layout>} />
          <Route path="/monitoring" element={<Layout><MonitoringPage /></Layout>} />
          <Route path="/data" element={<Layout><DataManagement /></Layout>} />
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
