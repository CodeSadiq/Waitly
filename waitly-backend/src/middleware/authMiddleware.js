import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Staff from "../models/Staff.js";
import Admin from "../models/Admin.js";

export const protect = () => async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login."
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Session expired. Please login again.",
          expired: true
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid authentication token"
      });
    }

    // Query the correct model based on role, with fallback to User model
    let user;
    if (decoded.role === "admin") {
      user = await Admin.findById(decoded.id).select("-password");
      if (!user) user = await User.findById(decoded.id).select("-password");
    } else if (decoded.role === "staff") {
      user = await Staff.findById(decoded.id).select("-password");
      if (!user) user = await User.findById(decoded.id).select("-password");
    } else {
      user = await User.findById(decoded.id).select("-password");
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again."
      });
    }

    req.user = user.toObject();
    req.user.role = decoded.role;

    // Add placeId if it exists in token (for staff)
    if (decoded.placeId) {
      req.user.placeId = decoded.placeId;
    }

    next();
  } catch (err) {
    console.error("AUTH MIDDLEWARE ERROR:", err.message);
    res.status(401).json({
      success: false,
      message: "Authentication failed"
    });
  }
};

/* ================= ROLE-BASED MIDDLEWARE ================= */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access this resource"
      });
    }

    next();
  };
};

/* ================= LEGACY EXPORTS (FOR BACKWARD COMPATIBILITY) ================= */
export const verifyUser = protect();
export const verifyStaff = protect();
export const verifyAdmin = protect();
