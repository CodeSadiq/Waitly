import API_BASE from "../config/api";

/* ================= AUTH API SERVICE ================= */
export const authAPI = {
    // Register
    register: async (userData) => {
        const res = await fetch(`${API_BASE}/api/auth/user/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Registration failed");
        }

        return data;
    },

    // Staff Register
    staffRegister: async (userData) => {
        const res = await fetch(`${API_BASE}/api/auth/staff/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Staff registration failed");
        }

        return data;
    },

    // User Login
    login: async (credentials) => {
        const res = await fetch(`${API_BASE}/api/auth/user/login`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Login failed");
        }

        return data;
    },

    // Staff Login
    staffLogin: async (credentials) => {
        const res = await fetch(`${API_BASE}/api/auth/staff/login`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Staff login failed");
        }

        return data;
    },

    // Admin Login
    adminLogin: async (credentials) => {
        const res = await fetch(`${API_BASE}/api/auth/admin/login`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Admin login failed");
        }

        return data;
    },

    // Get Current User
    getUser: async () => {
        const res = await fetch(`${API_BASE}/api/auth/user`, {
            credentials: "include"
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to get user");
        }

        return data;
    },

    // Logout
    logout: async () => {
        const res = await fetch(`${API_BASE}/api/auth/logout`, {
            method: "POST",
            credentials: "include"
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Logout failed");
        }

        return data;
    },

    // Forgot Password
    forgotPassword: async (email) => {
        const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to send reset email");
        }

        return data;
    },

    // Reset Password
    resetPassword: async (token, password, confirmPassword) => {
        const res = await fetch(`${API_BASE}/api/auth/reset-password/${token}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password, confirmPassword })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to reset password");
        }

        return data;
    },

    // Change Password
    changePassword: async (currentPassword, newPassword, confirmPassword) => {
        const res = await fetch(`${API_BASE}/api/auth/change-password`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to change password");
        }

        return data;
    },

    // Refresh Token
    refreshToken: async () => {
        const res = await fetch(`${API_BASE}/api/auth/refresh-token`, {
            method: "POST",
            credentials: "include"
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to refresh token");
        }

        return data;
    },
    // Unified Login
    unifiedLogin: async (credentials) => {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Login failed");
        }

        return data;
    }
};
