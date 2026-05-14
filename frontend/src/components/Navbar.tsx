import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
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

  if (!user) return null;

  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-700 mb-8 shadow-sm transition-colors">
      <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">FinanceTracker</h1>
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsDark(!isDark)} 
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-xl"
          title="Toggle Theme"
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{user.email}</span>
        <button onClick={signOut} className="text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md transition-colors font-semibold">
          Logout
        </button>
      </div>
    </nav>
  );
};