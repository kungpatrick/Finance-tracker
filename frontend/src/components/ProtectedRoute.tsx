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
    typeof window !== 'undefined' && 
    (window.location.href.includes('type=recovery') || 
     sessionStorage.getItem('finance_tracker_awaiting_reset') === 'true')
  );

  useEffect(() => {
    // Listen for the recovery event to prevent redirecting to dashboard during password reset
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // If the event is PASSWORD_RECOVERY, we are in the recovery flow.
      // We check the URL to ensure this tab is the one intended for the update.
      if (event === 'PASSWORD_RECOVERY' && window.location.href.includes('type=recovery')) {
        setIsRecovering(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div>Loading session...</div>;
  
  // Immediate check for recovery flow in the current URL
  const isLocalRecovery = typeof window !== 'undefined' && window.location.href.includes('type=recovery');
  const isAwaiting = typeof window !== 'undefined' && sessionStorage.getItem('finance_tracker_awaiting_reset') === 'true';

  if (!user || isRecovering || isLocalRecovery || isAwaiting) {
    return <Auth onRecoveryComplete={() => {
      setIsRecovering(false);
      sessionStorage.removeItem('finance_tracker_awaiting_reset');
    }} />;
  }

  return <>{children}</>;
};