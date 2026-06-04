import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Auth } from './Auth';
import { supabase } from '../lib/supabaseClient';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    // Listen for the recovery event to prevent redirecting to dashboard during password reset
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Check URL hash for immediate detection of recovery flow on page load
  const isHashRecovering = typeof window !== 'undefined' && window.location.hash.includes('type=recovery');

  if (loading) return <div>Loading session...</div>;
  
  // If no user is logged in, or we are in a recovery flow, show the Auth component
  if (!user || isRecovering || isHashRecovering) {
    return <Auth onRecoveryComplete={() => setIsRecovering(false)} />;
  }

  return <>{children}</>;
};