import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Auth } from './Auth';
import { supabase } from '../lib/supabaseClient';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  // Lock recovery mode if the hash is present or if we are the tab that requested it
  const [isRecovering, setIsRecovering] = useState(() => 
    typeof window !== 'undefined' && (
      window.location.hash.includes('type=recovery') || 
      sessionStorage.getItem('finance_tracker_awaiting_reset') === 'true'
    )
  );

  useEffect(() => {
    // Listen for the recovery event to prevent redirecting to dashboard during password reset
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // Only trigger recovery UI if the hash is present in THIS specific window
      if (event === 'PASSWORD_RECOVERY' && window.location.hash.includes('type=recovery')) {
        setIsRecovering(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div>Loading session...</div>;
  
  // If we have a user but this specific tab is awaiting a reset or performing one,
  // we show the Auth component to prevent the Dashboard from hijacking the view.
  const isLocalRecovery = typeof window !== 'undefined' && window.location.hash.includes('type=recovery');
  const isAwaiting = typeof window !== 'undefined' && sessionStorage.getItem('finance_tracker_awaiting_reset') === 'true';

  if (!user || isRecovering || isLocalRecovery || isAwaiting) {
    return <Auth onRecoveryComplete={() => {
      setIsRecovering(false);
      sessionStorage.removeItem('finance_tracker_awaiting_reset');
    }} />;
  }

  return <>{children}</>;
};