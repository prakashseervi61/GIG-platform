import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import Home from "./pages/Home";
import CategoryPage from "./pages/CategoryPage";
import ServicesPage from "./pages/ServicesPage";
import ServiceDetail from "./pages/ServiceDetail";
import Workers from "./pages/Workers";
import WorkerProfilePage from "./pages/WorkerProfilePage";
import Book from "./pages/Book";
import BookingDetail from "./pages/BookingDetail";
import MyBookings from "./pages/MyBookings";
import Transactions from "./pages/Transactions";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import Emergency from "./pages/Emergency";
import Payment from "./pages/Payment";
import BookingConfirm from "./pages/BookingConfirm";
import TrackBooking from "./pages/TrackBooking";
import RateWorker from "./pages/RateWorker";
import SavedAddresses from "./pages/SavedAddresses";
import HelpSupport from "./pages/HelpSupport";
import { Shell } from "./components/shell";
import { Spinner } from "./components/ui";

function FullLoader() {
  return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
}

/**
 * Persistent chrome for signed-in pages. Lives above the route outlet so the
 * header and floating dock survive navigation - if the shell remounted per
 * route, the dock's sliding indicator would have no previous state to animate
 * from and would jump.
 */
function CustomerLayout() {
  const { user, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (!user) return <Navigate to="/splash" replace />;
  if (user.role !== "customer") return <Navigate to="/splash" replace />;
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/splash" element={<Splash />} />
      <Route path="/login" element={<Login />} />

      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/category/:name" element={<CategoryPage />} />
        <Route path="/category" element={<ServicesPage />} />
        <Route path="/services/:id" element={<ServiceDetail />} />
        <Route path="/services/:id/workers" element={<Workers />} />
        <Route path="/workers/:id" element={<WorkerProfilePage />} />
        <Route path="/book" element={<Book />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/bookings/:id" element={<BookingDetail />} />
        <Route path="/bookings/:id/confirm" element={<BookingConfirm />} />
        <Route path="/bookings/:id/track" element={<TrackBooking />} />
        <Route path="/bookings/:id/rate" element={<RateWorker />} />
        <Route path="/payments" element={<Transactions />} />
        <Route path="/payments/:id" element={<Payment />} />
        <Route path="/invoices" element={<Transactions />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/addresses" element={<SavedAddresses />} />
        <Route path="/emergency" element={<Emergency />} />
        <Route path="/help" element={<HelpSupport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
