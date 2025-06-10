
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import LandingPage from "./pages/LandingPage";
import Pipeline from "./pages/Pipeline";
import MonitoringPage from "./pages/MonitoringPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Landing page without sidebar */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Pages with sidebar */}
          <Route path="/pipeline" element={
            <SidebarProvider>
              <div className="min-h-screen flex w-full">
                <AppSidebar />
                <main className="flex-1">
                  <header className="h-12 flex items-center border-b bg-white/80 backdrop-blur">
                    <SidebarTrigger className="ml-2" />
                    <h2 className="ml-4 text-lg font-semibold">Pipeline de Modelagem</h2>
                  </header>
                  <Pipeline />
                </main>
              </div>
            </SidebarProvider>
          } />
          
          <Route path="/monitoring" element={
            <SidebarProvider>
              <div className="min-h-screen flex w-full">
                <AppSidebar />
                <main className="flex-1">
                  <header className="h-12 flex items-center border-b bg-white/80 backdrop-blur">
                    <SidebarTrigger className="ml-2" />
                    <h2 className="ml-4 text-lg font-semibold">Monitoramento de Modelos</h2>
                  </header>
                  <MonitoringPage />
                </main>
              </div>
            </SidebarProvider>
          } />
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
