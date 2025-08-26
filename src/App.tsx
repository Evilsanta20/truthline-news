import { Routes, Route } from "react-router-dom";
import AuthPage from "@/components/auth/AuthPage";
import { Navbar } from "@/components/layout/Navbar";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ViewerPage from "./pages/ViewerPage";
import EditorPage from "./pages/EditorPage";
import AdminPage from "./pages/AdminPage";
import AdminContentDashboard from "./pages/AdminContentDashboard";

const App = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/viewer" element={<ViewerPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/content-quality" element={<AdminContentDashboard />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
  </div>
);

export default App;
