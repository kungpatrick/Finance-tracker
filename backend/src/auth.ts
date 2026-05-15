import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

// Ensure both URL and Key are present and URL looks like a valid Supabase URL
const isSupabaseConfigured = supabaseUrl.startsWith('http') && !supabaseUrl.includes('your-project-id') && supabaseKey.length > 0;

if (isSupabaseConfigured) {
  console.log('[Auth] Supabase client initialized.');
  console.log(`[Auth] URL: ${supabaseUrl}`);
  console.log(`[Auth] Key prefix: ${supabaseKey.substring(0, 10)}...`);
  console.log(`[Auth] Key length: ${supabaseKey.length} characters`);
} else {
  console.error('[Auth] Supabase client NOT configured correctly. Check your .env file for missing URL or Key, or an invalid URL format.');
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export interface AuthRequest extends Request {
  user?: { id: string };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader && process.env.NODE_ENV === 'development') {
    req.user = { id: '00000000-0000-0000-0000-000000000000' };
    return next();
  }

  const token = authHeader?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing authentication token' });

  if (!supabase) {
    return res.status(503).json({ error: 'Authentication service not configured' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    console.error('[AuthMiddleware] Verification failed:', {
      message: error?.message || 'No user found',
      tokenProvided: !!token,
      tokenLength: token?.length
    });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = { id: user.id };
  next();
};