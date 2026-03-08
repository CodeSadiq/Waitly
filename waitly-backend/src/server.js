
import dotenv from "dotenv";
dotenv.config();


import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";        // ✅ ADD
import authRoutes from "./routes/auth.routes.js"; // ✅ ADD
import passport from "./config/passport.js";       // ✅ ADD
import { seedAdmin } from "./utils/seedAdmin.js";

import locationRoutes from "./routes/locationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import queueRoutes from "./routes/queue.js";
import staffRoutes from "./routes/staff.routes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

console.log("JWT SECRET:", process.env.JWT_SECRET);

const app = express();
app.use(passport.initialize());

/* ================= CORS ================= */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://waitly-frontend.onrender.com"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// app.use(cors({
//   origin: "http://localhost:5173",
//   credentials: true
// }));



/* ================= MIDDLEWARE ================= */
app.use(express.json());
app.use(cookieParser()); // 🔐 REQUIRED FOR JWT COOKIE

/* ================= ROUTES ================= */
app.use("/api/auth", authRoutes);        // 🔐 AUTH ROUTES
app.use("/api/location", locationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/reviews", reviewRoutes);

/* ================= TEST ================= */
app.get("/", (req, res) => {
  res.send("WAITLY Backend Running");
});

/* ================= DATABASE ================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    seedAdmin();  // Auto-run admin seeder
  })
  .catch((err) => console.error(err));

/* ================= SOCKET.IO ================= */
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://waitly-frontend.onrender.com"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});


io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
