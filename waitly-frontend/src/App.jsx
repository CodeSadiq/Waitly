import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import JoinQueue from "./pages/JoinQueue.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import "./index.css";
import AdminDashboard from "./admin/AdminDashboard";
import AddPlace from "./admin/AdminPlace";
import StaffDashboard from "./pages/StaffDashboard.jsx";
import UserDashboard from "./pages/UserDashboard.jsx";

export default function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Protected User Routes - Require login */}
        <Route
          path="/join-queue/:placeId"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <JoinQueue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/dashboard"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/add"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AddPlace />
            </ProtectedRoute>
          }
        />

        {/* Protected Staff Route */}
        <Route
          path="/staff/dashboard"
          element={
            <ProtectedRoute allowedRoles={["staff"]}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
