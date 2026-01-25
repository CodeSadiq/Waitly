import User from "../models/User.js";
import Admin from "../models/Admin.js";
import Staff from "../models/Staff.js";
import { createToken } from "../utils/jwt.js";

/* ================= USER REGISTER ================= */
export const userRegister = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    const allowedRoles = ["user", "staff", "admin"];
    const finalRole = allowedRoles.includes(role) ? role : "user";

    const exists = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    await User.create({
      username,
      email,
      password,
      role: finalRole
    });

    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Registration failed" });
  }
};

/* ================= USER LOGIN ================= */
export const userLogin = async (req, res) => {
  const { identifier, password } = req.body;

  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }]
  });

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = createToken({
    id: user._id,
    role: user.role
  });

  // ✅ CHROME SAFE COOKIE
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "none",
    secure: true
  });

  res.json({ role: user.role });
};

/* ================= STAFF LOGIN ================= */
export const staffLogin = async (req, res) => {
  const { identifier, password } = req.body;

  const staff = await Staff.findOne({
    $or: [{ email: identifier }, { username: identifier }]
  });

  if (!staff || !(await staff.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = createToken({
    id: staff._id,
    role: "staff",
    placeId: staff.placeId
  });

  // ✅ CHROME SAFE COOKIE
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "none",
    secure: true
  });

  res.json({ role: "staff" });
};

/* ================= ADMIN LOGIN ================= */
export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email });

  if (!admin || !(await admin.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = createToken({
    id: admin._id,
    role: "admin"
  });

  // ✅ CHROME SAFE COOKIE
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "none",
    secure: true
  });

  res.json({ role: "admin" });
};

/* ================= CURRENT USER ================= */
export const getMe = async (req, res) => {
  res.json({
    id: req.user._id,
    role: req.user.role
  });
};

/* ================= LOGOUT ================= */
export const logout = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
};
