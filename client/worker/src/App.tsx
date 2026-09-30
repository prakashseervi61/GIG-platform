import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./useAuth";
import Login from "./pages/Login";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import EarningsPage from "./pages/EarningsPage";
import WorkerProfile from "./pages/WorkerProfile";
import NotificationsPage from "./pages/NotificationsPage";
import { Spinner } from "./components/ui";

function RequireWorker({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "worker") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireWorker><Jobs /></RequireWorker>} />
      <Route path="/jobs/:id" element={<RequireWorker><JobDetail /></RequireWorker>} />
      <Route path="/earnings" element={<RequireWorker><EarningsPage /></RequireWorker>} />
      <Route path="/profile" element={<RequireWorker><WorkerProfile /></RequireWorker>} />
      <Route path="/notifications" element={<RequireWorker><NotificationsPage /></RequireWorker>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}