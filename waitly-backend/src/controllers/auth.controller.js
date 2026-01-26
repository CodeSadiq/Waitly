import User from "../models/User.js";
import Admin from "../models/Admin.js";
import Staff from "../models/Staff.js";
import { createToken } from "../utils/jwt.js";

/* =====================================================
   USER REGISTER
===================================================== */
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

/* =====================================================
   USER LOGIN
===================================================== */
export const userLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = createToken({
      id: user._id.toString(),
      role: user.role
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/"
    });

    res.json({ user });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Login failed" });
  }
};

/* =====================================================
   STAFF LOGIN
===================================================== */
export const staffLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const staff = await Staff.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!staff || !(await staff.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = createToken({
      id: staff._id.toString(),
      role: "staff",
      placeId: staff.placeId
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/"
    });

    res.json({ user: staff });

  } catch (err) {
    console.error("STAFF LOGIN ERROR:", err);
    res.status(500).json({ message: "Staff login failed" });
  }
};

/* =====================================================
   ADMIN LOGIN
===================================================== */
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });

    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = createToken({
      id: admin._id.toString(),
      role: "admin"
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/"
    });

    res.json({ user: admin });

  } catch (err) {
    console.error("ADMIN LOGIN ERROR:", err);
    res.status(500).json({ message: "Admin login failed" });
  }
};

/* =====================================================
   CURRENT USER
===================================================== */
export const getMe = async (req, res) => {
  res.json({ user: req.user });
};

/* =====================================================
   LOGOUT
===================================================== */
export const logout = (req, res) => {
  res.clearCookie("token", { path: "/" });
  res.json({ message: "Logged out" });
};
