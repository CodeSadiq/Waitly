import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles, children }) {
  const userRole = localStorage.getItem("waitly_role");

  // Case 1: Not logged in
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  // Case 2: Logged in but wrong role
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Case 3: Authorized
  return children;
}
