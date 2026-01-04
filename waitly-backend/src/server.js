import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import locationRoutes from "./routes/locationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();

/* ✅ CORS – THIS IS ENOUGH */
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
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

/* Server */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
