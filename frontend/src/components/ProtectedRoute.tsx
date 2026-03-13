import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";
import { Loader } from "./ui/Loader";

export const ProtectedRoute = ({
  roles,
}: {
  roles?: Role[];
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader text="Loading session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.forcePasswordChange && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (!user.forcePasswordChange && location.pathname === "/change-password") {
    return <Navigate to="/dashboard" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
