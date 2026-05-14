import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Auth } from './Auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading session...</div>;
  
  // If no user is logged in, show the Auth component instead of the children
  if (!user) return <Auth />;

  return <>{children}</>;
};