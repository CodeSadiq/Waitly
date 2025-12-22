import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import JoinQueue from "./pages/JoinQueue";
import Navbar from "./components/Navbar.jsx";
import "./index.css"

export default function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join-queue/:placeId" element={<JoinQueue />} />
      </Routes>
    </>
  );
}
