import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { PlaceProvider } from "./context/PlaceContext";
import { QueueProvider } from "./context/QueueContext";

import "./index.css";
import "./styles/theme.css";


const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <PlaceProvider>
        <QueueProvider>
          <App />
        </QueueProvider>
      </PlaceProvider>
    </BrowserRouter>
  </React.StrictMode>
);
