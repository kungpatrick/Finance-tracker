import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

// Prevent startup crash if placeholders are used in .env
const isConfigured = supabaseUrl.startsWith('http') && !supabaseUrl.includes('your-project-id');

export const supabase = isConfigured 
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
  
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });

  req.user = { id: user.id };
  next();
};