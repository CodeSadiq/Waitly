import { Routes, Route } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import JoinQueue from "../pages/JoinQueue";
import Feedback from "../pages/Feedback";
import Token from "../pages/Token";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/join" element={<JoinQueue />} />
      <Route path="/feedback" element={<Feedback />} />
      <Route path="/token" element={<Token />} />
    </Routes>
  );
}

export default AppRoutes;
