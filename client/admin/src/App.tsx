import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import Workers from "./pages/Workers";
import Forecast from "./pages/Forecast";
import { Spinner } from "./components/ui";

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "coop_admin" && user.role !== "federation_admin") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
      <Route path="/bookings" element={<RequireAdmin><Bookings /></RequireAdmin>} />
      <Route path="/workers" element={<RequireAdmin><Workers /></RequireAdmin>} />
      <Route path="/forecast" element={<RequireAdmin><Forecast /></RequireAdmin>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}