import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "./AuthProvider";

export function RequireAuth({
  children,
  loginPath = "/login",
  fallback,
}: {
  children: ReactNode;
  loginPath?: string;
  fallback?: ReactNode;
}) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <>{fallback ?? null}</>;
  }
  if (status === "unauthenticated") {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export function RequireRole({
  roles,
  children,
  redirectTo = "/",
}: {
  roles: string[];
  children: ReactNode;
  redirectTo?: string;
}) {
  const { user, status } = useAuth();
  if (status === "loading") return null;
  if (!user || !roles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
}
