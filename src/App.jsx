import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Auth from "./components/Auth";
import ProtectedRoute from "./components/ProtectedRoute";
import ChannelStats from "./pages/ChannelStats";
import RoleRoute from "./components/RoleRoute";
import Clients from "./pages/Clients";
import Users from "./pages/Users";
import Account from "./pages/Account";
import Revenue from "./pages/Revenue";
import Reports from "./pages/Reports";
import Alerts from "./pages/Alerts";
import PlatformProfile from "./pages/PlatformProfile";

function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen bg-[#080b14] font-sans">
      <Sidebar />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<ChannelStats />} />
                  <Route path="/github" element={<PlatformProfile key="github" platform="github" />} />
                  <Route path="/bluesky" element={<PlatformProfile key="bluesky" platform="bluesky" />} />
                  <Route path="/revenue" element={<RoleRoute roles={["creator", "agency", "admin"]}><Revenue /></RoleRoute>} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/clients" element={<RoleRoute roles={["agency"]}><Clients /></RoleRoute>} />
                  <Route path="/users" element={<RoleRoute roles={["admin"]}><Users /></RoleRoute>} />
                  <Route path="/account" element={<Account />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}