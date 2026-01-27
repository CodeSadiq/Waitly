/* ================= EMAIL VALIDATION ================= */
export const validateEmail = (email) => {
    const emailRegex = /^\S+@\S+\.\S+$/;

    if (!email) {
        return { isValid: false, error: "Email is required" };
    }

    if (!emailRegex.test(email)) {
        return { isValid: false, error: "Please enter a valid email address" };
    }

    return { isValid: true, error: null };
};

/* ================= PASSWORD VALIDATION ================= */
export const validatePassword = (password) => {
    const errors = [];

    if (!password) {
        return { isValid: false, errors: ["Password is required"] };
    }

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
    if (!username) {
        return { isValid: false, error: "Username is required" };
    }

    if (username.length < 3) {
        return { isValid: false, error: "Username must be at least 3 characters" };
    }

    if (username.length > 30) {
        return { isValid: false, error: "Username cannot exceed 30 characters" };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { isValid: false, error: "Username can only contain letters, numbers, and underscores" };
    }

    return { isValid: true, error: null };
};

/* ================= PASSWORD STRENGTH CHECKER ================= */
export const getPasswordStrength = (password) => {
    if (!password) return { level: "none", score: 0, color: "#ccc" };

    let strength = 0;

    if (password.length >= 6) strength += 1;
    if (password.length >= 10) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;

    if (strength <= 2) {
        return { level: "weak", score: strength, color: "#ef4444", text: "Weak" };
    }
    if (strength <= 4) {
        return { level: "medium", score: strength, color: "#f59e0b", text: "Medium" };
    }
    return { level: "strong", score: strength, color: "#10b981", text: "Strong" };
};

/* ================= FORM VALIDATION ================= */
export const validateLoginForm = (identifier, password) => {
    const errors = {};

    if (!identifier || identifier.trim() === "") {
        errors.identifier = "Username or email is required";
    }

    if (!password || password.trim() === "") {
        errors.password = "Password is required";
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

export const validateRegisterForm = (username, email, password, confirmPassword) => {
    const errors = {};

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
        errors.username = usernameValidation.error;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
        errors.email = emailValidation.error;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        errors.password = passwordValidation.errors[0];
    }

    if (password !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};
