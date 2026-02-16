import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
    const { user, loading } = useContext(AuthContext);

    // Show loading state
    if (loading) {
        return (
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "calc(100vh - var(--nav-height))",
                fontSize: "16px",
                color: "#6b7280"
            }}>
                Loading...
            </div>
        );
    }

    // Not logged in - redirect to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Check if user's role is allowed
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard based on role
        if (user.role === "admin") {
            return <Navigate to="/admin/dashboard" replace />;
        } else if (user.role === "staff") {
            return <Navigate to="/staff/dashboard" replace />;
        } else {
            return <Navigate to="/" replace />;
        }
    }

    // User is authorized
    return children;
}
