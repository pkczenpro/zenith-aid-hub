import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ProductEditor from "./pages/ProductEditor";
import ProductDocs from "./pages/ProductDocs";
import ProductManagement from "./pages/ProductManagement";
import ResourceManagement from "./pages/ResourceManagement";
import VideoManagement from "./pages/VideoManagement";
import ReleaseNotesManager from "./pages/ReleaseNotesManager";
import ArticleViewer from "./pages/ArticleViewer";
import ArticleList from "./pages/ArticleList";
import ArticleOrder from "./pages/ArticleOrder";
import ClientManagement from "./pages/ClientManagement";
import ClientDashboard from "./pages/ClientDashboard";
import ProductDashboard from "./pages/ProductDashboard";
import ChatAnalytics from "./pages/ChatAnalytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
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
            <Route path="/product/:productId/editor" element={
              <ProtectedRoute requireAdmin>
                <ProductEditor />
              </ProtectedRoute>
            } />
            <Route path="/product/:productId/articles" element={
              <ProtectedRoute requireAdmin>
                <ArticleList />
              </ProtectedRoute>
            } />
            <Route path="/product/:productId/articles/order" element={
              <ProtectedRoute requireAdmin>
                <ArticleOrder />
              </ProtectedRoute>
            } />
            <Route path="/product/:productId/docs" element={
              <ProtectedRoute>
                <ProductDocs />
              </ProtectedRoute>
            } />
            <Route path="/product/:productId/resources" element={
              <ProtectedRoute requireAdmin>
                <ResourceManagement />
              </ProtectedRoute>
            } />
            <Route path="/product/:productId/videos" element={
              <ProtectedRoute requireAdmin>
                <VideoManagement />
              </ProtectedRoute>
            } />
            <Route path="/product/:productId/release-notes/new" element={
              <ProtectedRoute requireAdmin>
                <ReleaseNotesManager />
              </ProtectedRoute>
            } />
            <Route path="/product/:productId/release-notes/:noteId" element={
              <ProtectedRoute requireAdmin>
                <ReleaseNotesManager />
              </ProtectedRoute>
            } />
            <Route path="/docs/:productId/:articleId" element={
              <ProtectedRoute>
                <ArticleViewer />
              </ProtectedRoute>
            } />
            <Route path="/product/:productId/article/:articleId" element={
              <ProtectedRoute>
                <ArticleViewer />
              </ProtectedRoute>
            } />
            <Route path="/clients" element={
              <ProtectedRoute requireAdmin>
                <ClientManagement />
              </ProtectedRoute>
            } />
            <Route path="/chat-analytics" element={
              <ProtectedRoute requireAdmin>
                <ChatAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/support" element={
              <ProtectedRoute requireAdmin>
                <ProductManagement />
              </ProtectedRoute>
            } />
            <Route path="/client/:clientId/docs" element={
              <ProtectedRoute>
                <ClientDashboard />
              </ProtectedRoute>
            } />
            <Route path="/client/dashboard" element={
              <ProtectedRoute>
                <ClientDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
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
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
