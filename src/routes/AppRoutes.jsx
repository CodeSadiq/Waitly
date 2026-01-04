import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/Login";
import JoinQueue from "../pages/JoinQueue";
import AdminDashboard from "../pages/Admindashboard";
import StaffDashboard from "../pages/StaffDashboard";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/join-queue/:placeId" element={<JoinQueue />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff"
        element={
          <ProtectedRoute role="staff">
            <StaffDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
