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
    (window.location.hash.includes('type=recovery') ||
     sessionStorage.getItem('finance_tracker_recovering') === 'true' ||
     sessionStorage.getItem('finance_tracker_awaiting_reset') === 'true')
  );

  useEffect(() => {
    // Immediate lock for new tabs opening the recovery link
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setIsRecovering(true);
      sessionStorage.setItem('finance_tracker_recovering', 'true');
    }

    // Listen for the recovery event to prevent redirecting to dashboard during password reset
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && window.location.hash.includes('type=recovery')) {
        setIsRecovering(true);
        sessionStorage.setItem('finance_tracker_recovering', 'true');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div>Loading session...</div>;
  
  // Immediate check for recovery flow in the current URL
  const isLocalRecovery = typeof window !== 'undefined' && window.location.hash.includes('type=recovery');
  const isLockedRecovery = typeof window !== 'undefined' && sessionStorage.getItem('finance_tracker_recovering') === 'true';
  const isAwaiting = typeof window !== 'undefined' && sessionStorage.getItem('finance_tracker_awaiting_reset') === 'true';

  if (!user || isRecovering || isLocalRecovery || isLockedRecovery || isAwaiting) {
    return <Auth onRecoveryComplete={() => {
      setIsRecovering(false);
      sessionStorage.removeItem('finance_tracker_recovering');
      sessionStorage.removeItem('finance_tracker_awaiting_reset');
    }} />;
  }

  return <>{children}</>;
};