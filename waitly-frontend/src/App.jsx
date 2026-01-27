import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import JoinQueue from "./pages/JoinQueue.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Navbar from "./components/Navbar.jsx";
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
        <Route path="/admin/add" element={<AddPlace />} />
        <Route path="/join-queue/:placeId" element={<JoinQueue />} />
        <Route path="/user/dashboard" element={<UserDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
      </Routes>
    </>
  );
}
