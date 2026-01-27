import { body, validationResult } from "express-validator";

/* ================= VALIDATION ERROR HANDLER ================= */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }

    next();
};

/* ================= REGISTER VALIDATION ================= */
export const validateRegister = [
    body("username")
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage("Username must be between 3 and 30 characters")
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage("Username can only contain letters, numbers, and underscores"),

    body("email")
        .trim()
        .isEmail()
        .withMessage("Please provide a valid email")
        .normalizeEmail(),

    body("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),

    body("role")
        .optional()
        .isIn(["user", "staff", "admin"])
        .withMessage("Invalid role"),

    handleValidationErrors
];

/* ================= LOGIN VALIDATION ================= */
export const validateLogin = [
    body("identifier")
        .trim()
        .notEmpty()
        .withMessage("Username or email is required"),

    body("password")
        .notEmpty()
        .withMessage("Password is required"),

    handleValidationErrors
];

/* ================= ADMIN LOGIN VALIDATION ================= */
export const validateAdminLogin = [
    body("email")
        .trim()
        .isEmail()
        .withMessage("Please provide a valid email")
        .normalizeEmail(),

    body("password")
        .notEmpty()
        .withMessage("Password is required"),

    handleValidationErrors
];

/* ================= EMAIL VALIDATION ================= */
export const validateEmail = [
    body("email")
        .trim()
        .isEmail()
        .withMessage("Please provide a valid email")
        .normalizeEmail(),

    handleValidationErrors
];

/* ================= PASSWORD RESET VALIDATION ================= */
export const validatePasswordReset = [
    body("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),

    body("confirmPassword")
        .custom((value, { req }) => value === req.body.password)
        .withMessage("Passwords do not match"),

    handleValidationErrors
];

/* ================= CHANGE PASSWORD VALIDATION ================= */
export const validatePasswordChange = [
    body("currentPassword")
        .notEmpty()
        .withMessage("Current password is required"),

    body("newPassword")
        .isLength({ min: 6 })
        .withMessage("New password must be at least 6 characters")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage("New password must contain at least one uppercase letter, one lowercase letter, and one number"),

    body("confirmPassword")
        .custom((value, { req }) => value === req.body.newPassword)
        .withMessage("Passwords do not match"),

    handleValidationErrors
];
