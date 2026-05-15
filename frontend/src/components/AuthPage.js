import React, { useState } from 'react';

const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // This AuthPage is currently a mock. In a real scenario, you'd integrate with Supabase auth directly here.
    // const API_URL = import.meta.env.VITE_API_URL || '';
    // const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

    // Note: Actual implementation will use your Supabase backend routes
    // For now, simulating success to proceed to Dashboard
    setTimeout(() => {
      onLogin({ name: email.split('@')[0], email });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="auth-container" style={{ maxWidth: '400px', margin: '100px auto', padding: '30px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
      <h2 style={{ color: '#0d6efd' }}>{isLogin ? 'Sign In' : 'Create Account'}</h2>
      <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Welcome to your Personal Finance Tracker</p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        <input 
          type="email" 
          placeholder="Email address" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit' }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '12px', borderRadius: '6px', border: 'none', background: loading ? '#ccc' : '#0d6efd', color: 'white', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
        </button>
      </form>

      <div style={{ marginTop: '20px' }}>
        <p style={{ fontSize: '0.8rem', marginBottom: '10px' }}>Or continue with</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button disabled style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'not-allowed', color: 'inherit' }}>Google</button>
          <button disabled style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'not-allowed', color: 'inherit' }}>Facebook</button>
        </div>
      </div>

      <div style={{ marginTop: '25px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
        <button 
          onClick={() => setIsLogin(!isLogin)} 
          style={{ background: 'none', border: 'none', color: '#0d6efd', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
      {!isLogin && <p style={{ fontSize: '0.7rem', marginTop: '10px', color: '#6c757d' }}>Note: You will receive a confirmation email to activate your account.</p>}
    </div>
  );
};

export default AuthPage;