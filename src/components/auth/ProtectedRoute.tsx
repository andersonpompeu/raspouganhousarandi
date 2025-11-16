import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole, AppRole } from "@/hooks/useUserRole";

interface ProtectedRouteProps {
  allowedRoles: AppRole[];
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole(user?.id);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // Not authenticated -> go to auth
  if (!user) return <Navigate to="/auth" replace />;

  // Authorized
  if (role && allowedRoles.includes(role)) return <>{children}</>;

  // Authenticated but wrong role: route them to their home
  if (role === 'company_partner') return <Navigate to="/company" replace />;
  if (role === 'admin') return <Navigate to="/dashboard" replace />;

  // Unknown role -> login
  return <Navigate to="/auth" replace />;
};

export default ProtectedRoute;
