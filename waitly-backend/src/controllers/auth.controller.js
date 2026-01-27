import User from "../models/User.js";
import Admin from "../models/Admin.js";
import Staff from "../models/Staff.js";
import { createAccessToken, createRefreshToken } from "../utils/jwt.js";
import crypto from "crypto";

/* =====================================================
   USER REGISTER
===================================================== */
export const userRegister = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    const allowedRoles = ["user", "staff", "admin"];
    const finalRole = allowedRoles.includes(role) ? role : "user";

    // Check if user already exists
    const exists = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: exists.email === email
          ? "Email already registered"
          : "Username already taken"
      });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      role: finalRole
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);

    // Handle mongoose validation errors
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors
      });
    }

    // DEBUG: Send actual error
    res.status(500).json({
      success: false,
      message: `Registration failed: ${err.message}`, // Include error message
      error: err // Include full error object
    });
  }
};

/* =====================================================
   STAFF REGISTER
   ===================================================== */
// START: Updated staffRegister
export const staffRegister = async (req, res) => {
  try {
    const { username, email, password } = req.body; // Removed placeName/address/counters

    // Check if staff exists
    const exists = await Staff.findOne({
      $or: [{ email }, { username }]
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: exists.email === email
          ? "Email already registered"
          : "Username already taken"
      });
    }

    // Create Staff (Unassigned, no requestDetails)
    const staff = await Staff.create({
      username,
      email,
      password,
      status: "unassigned",
      // No requestDetails needed anymore
    });

    res.status(201).json({
      success: true,
      message: "Account created. Please login to apply for a workplace.",
      user: {
        id: staff._id,
        username: staff.username,
        email: staff.email,
        role: "staff",
        status: "unassigned"
      }
    });

  } catch (err) {
    console.error("STAFF REGISTER ERROR:", err);
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: "Validation failed", errors });
    }
    res.status(500).json({
      success: false,
      message: "Staff registration failed"
    });
  }
};
// END: Updated staffRegister

/* =====================================================
   USER LOGIN
===================================================== */
export const userLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create tokens
    const token = createAccessToken({
      id: user._id.toString(),
      role: user.role
    });

    const refreshToken = createRefreshToken({
      id: user._id.toString(),
      role: user.role
    });

    // Set cookies
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again."
    });
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

    if (!staff) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const isPasswordValid = await staff.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Update last login
    staff.lastLogin = new Date();
    await staff.save();

    const token = createAccessToken({
      id: staff._id.toString(),
      role: "staff",
      placeId: staff.placeId
    });

    const refreshToken = createRefreshToken({
      id: staff._id.toString(),
      role: "staff",
      placeId: staff.placeId
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: staff._id,
        username: staff.username,
        email: staff.email,
        role: "staff",
        placeId: staff.placeId
      }
    });

  } catch (err) {
    console.error("STAFF LOGIN ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Staff login failed. Please try again."
    });
  }
};

/* =====================================================
   UNIFIED LOGIN (PROPER SEQUENTIAL CHECK)
===================================================== */
export const unifiedLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Missing credentials" });
    }

    let account = null;
    let role = "";

    // 1. Try User
    account = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (account) {
      role = account.role;
    } else {
      // 2. Try Staff
      account = await Staff.findOne({ $or: [{ email: identifier }, { username: identifier }] });
      if (account) {
        role = "staff";
      } else {
        // 3. Try Admin (email only usually)
        account = await Admin.findOne({ email: identifier });
        if (account) {
          role = "admin";
        }
      }
    }

    if (!account) {
      return res.status(401).json({ success: false, message: "Invalid username or email" });
    }

    // Verify Password
    const isPasswordValid = await account.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    // Update last login
    account.lastLogin = new Date();
    await account.save();

    // Create Tokens
    const payload = {
      id: account._id.toString(),
      role,
      ...(role === "staff" && { placeId: account.placeId })
    };

    const token = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);

    // Set Cookies
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: account._id,
        username: account.username || account.email,
        email: account.email,
        role: role,
        ...(role === "staff" && { placeId: account.placeId, status: account.status })
      }
    });

  } catch (err) {
    console.error("UNIFIED LOGIN ERROR:", err);
    res.status(500).json({ success: false, message: "Internal server error during login" });
  }
};

/* =====================================================
   ADMIN LOGIN
===================================================== */
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    const token = createAccessToken({
      id: admin._id.toString(),
      role: "admin"
    });

    const refreshToken = createRefreshToken({
      id: admin._id.toString(),
      role: "admin"
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: admin._id,
        email: admin.email,
        role: "admin"
      }
    });

  } catch (err) {
    console.error("ADMIN LOGIN ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Admin login failed. Please try again."
    });
  }
};

/* =====================================================
   CURRENT USER
===================================================== */
export const getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
};

/* =====================================================
   LOGOUT
===================================================== */
export const logout = (req, res) => {
  res.clearCookie("token", { path: "/" });
  res.clearCookie("refreshToken", { path: "/" });

  res.json({
    success: true,
    message: "Logged out successfully"
  });
};

/* =====================================================
   FORGOT PASSWORD
===================================================== */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Try to find user in all collections
    let user = await User.findOne({ email });
    let userType = "user";

    if (!user) {
      user = await Staff.findOne({ email });
      userType = "staff";
    }

    if (!user) {
      user = await Admin.findOne({ email });
      userType = "admin";
    }

    if (!user) {
      // Don't reveal if email exists or not (security)
      return res.json({
        success: true,
        message: "If that email exists, a password reset link has been sent."
      });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // In production, send email here
    // For now, return the token (REMOVE IN PRODUCTION)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    console.log("Password Reset URL:", resetUrl);

    res.json({
      success: true,
      message: "Password reset link sent to your email",
      // REMOVE IN PRODUCTION:
      resetToken,
      resetUrl
    });

  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to process password reset request"
    });
  }
};

/* =====================================================
   RESET PASSWORD
===================================================== */
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash the token to compare with database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Try to find user with valid reset token
    let user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    let userType = "user";

    if (!user) {
      user = await Staff.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
      });
      userType = "staff";
    }

    if (!user) {
      user = await Admin.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
      });
      userType = "admin";
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token"
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successful. You can now login with your new password."
    });

  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to reset password"
    });
  }
};

/* =====================================================
   CHANGE PASSWORD (AUTHENTICATED)
===================================================== */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Get user based on role
    let user;
    if (userRole === "admin") {
      user = await Admin.findById(userId);
    } else if (userRole === "staff") {
      user = await Staff.findById(userId);
    } else {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Set new password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to change password"
    });
  }
};

/* =====================================================
   REFRESH TOKEN
===================================================== */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: oldRefreshToken } = req.cookies;

    if (!oldRefreshToken) {
      return res.status(401).json({
        success: false,
        message: "No refresh token provided"
      });
    }

    // Verify refresh token
    const { verifyToken } = await import("../utils/jwt.js");
    const decoded = verifyToken(oldRefreshToken, true);

    // Create new tokens
    const newAccessToken = createAccessToken({
      id: decoded.id,
      role: decoded.role,
      ...(decoded.placeId && { placeId: decoded.placeId })
    });

    const newRefreshToken = createRefreshToken({
      id: decoded.id,
      role: decoded.role,
      ...(decoded.placeId && { placeId: decoded.placeId })
    });

    // Set new cookies
    res.cookie("token", newAccessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });

    res.json({
      success: true,
      message: "Token refreshed successfully"
    });

  } catch (err) {
    console.error("REFRESH TOKEN ERROR:", err);
    res.status(401).json({
      success: false,
      message: "Invalid refresh token"
    });
  }
};
