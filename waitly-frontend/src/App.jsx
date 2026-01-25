import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import JoinQueue from "./pages/JoinQueue.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Login.jsx"
import Navbar from "./components/Navbar.jsx";
import "./index.css";
import AdminDashboard from "./admin/AdminDashboard";
import AddPlace from "./admin/AdminPlace";
import StaffDashboard from "./pages/StaffDashboard.jsx";
import MyTicket from "./pages/MyTicket";




export default function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
          <Route path="/admin/add" element={<AddPlace />} />
        <Route path="/join-queue/:placeId" element={<JoinQueue />} />
         <Route path="/my-ticket" element={<MyTicket />} />
         <Route path="/admin/dashboard" element={<AdminDashboard />} />
         <Route path="/staff/dashboard" element={<StaffDashboard />} />
      </Routes>
    </>
  );
}
