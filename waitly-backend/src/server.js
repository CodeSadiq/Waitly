import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";              // 🔹 ADD
import { Server } from "socket.io";   // 🔹 ADD

import locationRoutes from "./routes/locationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();

/* ✅ CORS – THIS IS ENOUGH */
app.use(cors({
  origin: [
    "http://localhost:5173",              // local dev
    "https://waitly-frontend.onrender.com" // production
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

/* Body parser */
app.use(express.json());

/* Routes */
app.use("/api/location", locationRoutes);
app.use("/api/admin", adminRoutes);

/* Test */
app.get("/", (req, res) => {
  res.send("WAITLY Backend Running");
});

/* Mongo */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error(err));

/* ================================
   🔥 SOCKET.IO (ADDED SAFELY)
   ================================ */

// 👇 wrap existing express app
const server = http.createServer(app);

// 👇 attach socket.io
export const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://waitly-frontend.onrender.com"
    ],
    methods: ["GET", "POST"]
  }
});

// 👂 socket listeners
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

/* Server */
const PORT = process.env.PORT || 5000;

// ❗ IMPORTANT: use `server.listen`, NOT `app.listen`
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
