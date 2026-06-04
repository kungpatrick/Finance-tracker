import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Auth } from './Auth';
import { supabase } from '../lib/supabaseClient';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  // Initialize based on hash and keep it "locked" for this render cycle
  const [isRecovering, setIsRecovering] = useState(() => 
    typeof window !== 'undefined' && window.location.hash.includes('type=recovery')
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
  
  // Show Auth if no user, OR if this tab is specifically in recovery mode
  if (!user || isRecovering) {
    return <Auth onRecoveryComplete={() => setIsRecovering(false)} />;
  }

  return <>{children}</>;
};