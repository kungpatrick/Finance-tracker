import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AuthProps {
  onRecoveryComplete?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onRecoveryComplete }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(
    typeof window !== 'undefined' && window.location.hash.includes('type=recovery')
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    // If we mount with a recovery hash, ensure we are in the right view and clean the URL
    if (window.location.hash.includes('type=recovery')) {
      setIsUpdatingPassword(true);
      setIsResetPassword(false);
      setIsSignUp(false);
      window.history.replaceState(null, "", window.location.pathname);
    }

    // Listen for the PASSWORD_RECOVERY event triggered when clicking the email link
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsUpdatingPassword(true);
        setIsResetPassword(false);
        setIsSignUp(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isUpdatingPassword) {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          setError(updateError.message);
        } else {
          setMessage('Password updated successfully! You can now log in.');
          setIsUpdatingPassword(false);
          if (onRecoveryComplete) {
            onRecoveryComplete();
          }
        }
      } else if (isResetPassword) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${window.location.pathname}`,
        });
        if (resetError) {
          setError(resetError.message);
        } else {
          setMessage('A password reset link has been sent to your email address.');
        }
      } else {
        const { error: authError } = isSignUp 
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password });

        if (authError) {
          setError(authError.message);
        } else if (isSignUp) {
          setMessage('A confirmation link has been sent to your email address.');
        }
      }
    } catch (err: any) {
      setError('The authentication server took too long to respond. Please check your internet connection or try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-black p-4 transition-colors">
      <div className="absolute top-4 right-4">
        <button 
          onClick={() => setIsDark(!isDark)} 
          className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-xl shadow-sm border border-gray-200 dark:border-gray-700"
          title="Toggle Theme"
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
      <div className="w-full max-w-md bg-white dark:bg-black p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-colors">
        <h1 className="text-center text-indigo-600 dark:text-indigo-400 font-bold text-xl uppercase tracking-widest mb-2 transition-colors">Finance Tracker</h1>
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-6 transition-colors">
          {isUpdatingPassword ? 'Update Password' : isResetPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm border border-green-100" role="status">
              {message}
            </div>
          )}
          {!isUpdatingPassword && (
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1 transition-colors">
                Email
              </label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>
          )}
          {!isResetPassword && (
            <div className="transition-colors">
              <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1 transition-colors">
                {isUpdatingPassword ? 'New Password' : 'Password'}
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>
          )}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : isUpdatingPassword ? 'Update Password' : isResetPassword ? 'Send Reset Link' : isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400 transition-colors">
          {isResetPassword || isUpdatingPassword ? (
            <button 
              onClick={() => { setIsResetPassword(false); setIsUpdatingPassword(false); setError(null); setMessage(null); }}
              className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline focus:outline-none"
            >
              Back to Login
            </button>
          ) : (
            <>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button 
                onClick={() => { setIsSignUp(!isSignUp); setIsResetPassword(false); setError(null); setMessage(null); }} 
                className="ml-1 text-indigo-600 hover:text-indigo-800 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {isSignUp ? 'Login' : 'Sign Up'}
              </button>
              {!isSignUp && (
                <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
                  Forgot password?{' '}
                  <button 
                    type="button"
                    onClick={() => { setIsResetPassword(true); setError(null); setMessage(null); }}
                    className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline transition-colors"
                  >
                    Reset it
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};