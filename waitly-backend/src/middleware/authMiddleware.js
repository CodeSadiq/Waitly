import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = () => async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    req.user.role = decoded.role;

    next();
  } catch (err) {
    console.log("AUTH FAIL:", err.message);
    res.status(401).json({ message: "Auth failed" });
  }
};


export const verifyUser = protect(["user"]);
export const verifyStaff = protect(["staff"]);
export const verifyAdmin = protect(["admin"]);
