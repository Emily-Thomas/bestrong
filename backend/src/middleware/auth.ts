import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { JWTPayload } from '../types/index.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

const JWT_SECRET =
  process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (_error) {
    res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function generateToken(payload: JWTPayload): string {
  // Token expires in 1 week (7 days)
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
