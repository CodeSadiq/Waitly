import rateLimit from "express-rate-limit";

/* ================= LOGIN RATE LIMITER ================= */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests
    skipSuccessfulRequests: true
});

/* ================= REGISTER RATE LIMITER ================= */
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per hour per IP
    message: {
        success: false,
        message: "Too many accounts created. Please try again after an hour."
    },
    standardHeaders: true,
    legacyHeaders: false
});

/* ================= PASSWORD RESET RATE LIMITER ================= */
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset requests per hour
    message: {
        success: false,
        message: "Too many password reset requests. Please try again after an hour."
    },
    standardHeaders: true,
    legacyHeaders: false
});

/* ================= GENERAL AUTH RATE LIMITER ================= */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
        success: false,
        message: "Too many requests. Please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
});
