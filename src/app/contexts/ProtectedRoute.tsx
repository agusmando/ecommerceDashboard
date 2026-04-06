import { useAuth } from "./AuthContext.tsx";
import { Navigate, Outlet } from "react-router";

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <div>Cargando...</div>; // O un spinner

  if (!user || user.role !== "ADMIN") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />; // Renderiza las rutas hijas si el usuario existe
};
