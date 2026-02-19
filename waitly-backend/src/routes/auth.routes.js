import express from "express";
import {
   userRegister,
   userLogin,
   staffLogin,
   adminLogin,
   staffRegister,
   getMe,
   logout,
   forgotPassword,
   resetPassword,
   changePassword,
   refreshToken,
   unifiedLogin,
   googleAuth,
   googleCallback
} from "../controllers/auth.controller.js";

import { protect } from "../middleware/authMiddleware.js";
import {
   validateRegister,
   validateLogin,
   validateAdminLogin,
   validateEmail,
   validatePasswordReset,
   validatePasswordChange
} from "../middleware/validation.middleware.js";
import {
   loginLimiter,
   registerLimiter,
   passwordResetLimiter,
   authLimiter
} from "../middleware/rateLimiter.middleware.js";

const router = express.Router();

/* =====================================================
   REGISTER
   ===================================================== */
router.post("/user/register", validateRegister, userRegister);
router.post("/staff/register", staffRegister);

/* =====================================================
   LOGIN
   ===================================================== */
router.post("/user/login", validateLogin, userLogin);
router.post("/staff/login", validateLogin, staffLogin);
router.post("/admin/login", validateAdminLogin, adminLogin);
router.post("/login", validateLogin, unifiedLogin);

/* =====================================================
   CURRENT USER
   ===================================================== */
router.get("/user", protect(), getMe);

/* =====================================================
   PASSWORD MANAGEMENT
   ===================================================== */
router.post("/forgot-password", passwordResetLimiter, validateEmail, forgotPassword);
router.post("/reset-password/:token", validatePasswordReset, resetPassword);
router.post("/change-password", protect(), validatePasswordChange, changePassword);

/* =====================================================
   TOKEN REFRESH
   ===================================================== */
router.post("/refresh-token", refreshToken);

/* =====================================================
   LOGOUT
   ===================================================== */
/* =====================================================
   LOGOUT
   ===================================================== */
router.post("/logout", logout);

/* =====================================================
   GOOGLE AUTH
   ===================================================== */
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);

export default router;
