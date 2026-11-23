import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Login from "./pages/Login";

function Protected() {
  const { authenticated } = useAuth();
  return authenticated ? <Layout /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected />}>
            <Route path="/analise" element={<Dashboard />} />
            <Route path="/analise/:id" element={<Dashboard />} />
            <Route path="/historico" element={<History />} />
          </Route>
          <Route path="*" element={<Navigate to="/analise" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
