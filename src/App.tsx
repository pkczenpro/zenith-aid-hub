import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ProductEditor from "./pages/ProductEditor";
import ProductManagement from "./pages/ProductManagement";
import ArticleViewer from "./pages/ArticleViewer";
import ClientManagement from "./pages/ClientManagement";
import ClientDashboard from "./pages/ClientDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Index />} />
            <Route path="/products" element={
              <ProtectedRoute requireAdmin>
                <ProductManagement />
              </ProtectedRoute>
            } />
            <Route path="/product/:productId" element={
              <ProtectedRoute requireAdmin>
                <ProductEditor />
              </ProtectedRoute>
            } />
            <Route path="/docs/:productId/:articleId" element={
              <ProtectedRoute>
                <ArticleViewer />
              </ProtectedRoute>
            } />
            <Route path="/clients" element={
              <ProtectedRoute requireAdmin>
                <ClientManagement />
              </ProtectedRoute>
            } />
            <Route path="/client/:clientId/docs" element={
              <ProtectedRoute>
                <ClientDashboard />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
