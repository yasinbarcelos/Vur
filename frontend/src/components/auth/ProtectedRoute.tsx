import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLoading } from '@/components/ui/loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true 
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return <AuthLoading />;
  }

  // Se requer autenticação mas não está autenticado
  if (requireAuth && !isAuthenticated) {
    // Salvar a localização atual para redirecionar após login
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Se não requer autenticação mas está autenticado (ex: página de login)
  if (!requireAuth && isAuthenticated) {
    // Redirecionar para onde estava tentando ir ou dashboard
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
