import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import JoinQueue from "./pages/JoinQueue";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join-queue/:placeId" element={<JoinQueue />} />
      </Routes>
    </BrowserRouter>
  );
}
