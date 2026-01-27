/* ================= EMAIL VALIDATION ================= */
export const validateEmail = (email) => {
    const emailRegex = /^\S+@\S+\.\S+$/;
    return emailRegex.test(email);
};

/* ================= PASSWORD VALIDATION ================= */
export const validatePassword = (password) => {
    const errors = [];

    if (password.length < 6) {
        errors.push("Password must be at least 6 characters");
    }

    if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter");
    }

    if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter");
    }

    if (!/\d/.test(password)) {
        errors.push("Password must contain at least one number");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/* ================= USERNAME VALIDATION ================= */
export const validateUsername = (username) => {
    const errors = [];

    if (username.length < 3) {
        errors.push("Username must be at least 3 characters");
    }

    if (username.length > 30) {
        errors.push("Username cannot exceed 30 characters");
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        errors.push("Username can only contain letters, numbers, and underscores");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/* ================= SANITIZE INPUT ================= */
export const sanitizeInput = (input) => {
    if (typeof input !== "string") return input;

    // Remove leading/trailing whitespace
    let sanitized = input.trim();

    // Remove potential XSS characters
    sanitized = sanitized
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;");

    return sanitized;
};

/* ================= PASSWORD STRENGTH CHECKER ================= */
export const getPasswordStrength = (password) => {
    let strength = 0;

    if (password.length >= 6) strength += 1;
    if (password.length >= 10) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;

    if (strength <= 2) return { level: "weak", score: strength };
    if (strength <= 4) return { level: "medium", score: strength };
    return { level: "strong", score: strength };
};
