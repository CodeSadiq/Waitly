import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import JoinQueue from "./pages/JoinQueue";
<Route path="/join-queue/:placeId" element={<JoinQueue />} />


function App() {
  return (
    <>
      <Navbar />
      <Home />
    </>
  );
}

export default App;
