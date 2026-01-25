import jwt from "jsonwebtoken";
import User from "../src/models/User.js";

/* =====================================================
   GENERIC AUTH (USER / STAFF / ADMIN)
   ===================================================== */
export const protect = (roles = []) => {
  return async (req, res, next) => {
    try {
      const token =
        req.cookies?.token ||
        req.headers.authorization?.split(" ")[1];

      if (!token) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      req.user = user;

      next();
    } catch (err) {
      console.error("AUTH ERROR:", err.message);
      res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};

/* =====================================================
   SHORTCUT HELPERS (FOR OLD ROUTES)
   ===================================================== */

export const verifyUser = protect(["user"]);
export const verifyStaff = protect(["staff"]);
export const verifyAdmin = protect(["admin"]);
