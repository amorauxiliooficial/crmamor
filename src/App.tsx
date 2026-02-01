import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Conferencia from "./pages/Conferencia";
import Pagamentos from "./pages/Pagamentos";
import Financeiro from "./pages/Financeiro";
import Playbook from "./pages/Playbook";
import Senhas from "./pages/Senhas";
import Marketing from "./pages/Marketing";
import Indicar from "./pages/Indicar";
import Roadmap from "./pages/Roadmap";

import PreAnalises from "./pages/PreAnalises";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/conferencia" element={<Conferencia />} />
            <Route path="/pagamentos" element={<Pagamentos />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/playbook" element={<Playbook />} />
            <Route path="/senhas" element={<Senhas />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/indicar" element={<Indicar />} />
            
            <Route path="/pre-analises" element={<PreAnalises />} />
            <Route path="/roadmap" element={<Roadmap />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
