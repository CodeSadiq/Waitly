import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ role, children }) {
  const userRole = localStorage.getItem("waitly_role");

  if (userRole !== role) {
    return <Navigate to="/login" />;
  }

  return children;
}
