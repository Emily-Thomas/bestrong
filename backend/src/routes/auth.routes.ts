import { type Request, type Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as authService from '../services/auth.service';
import type { CreateAdminUserInput, LoginInput } from '../types';

const router = Router();

// Register new admin user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const input: CreateAdminUserInput = req.body;

    if (!input.email || !input.password || !input.name) {
      res.status(400).json({
        success: false,
        error: 'Email, password, and name are required',
      });
      return;
    }

    const user = await authService.createAdminUser(input);

    res.status(201).json({
      success: true,
      data: user,
      message: 'Admin user created successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ success: false, error: message });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const input: LoginInput = req.body;

    if (!input.email || !input.password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
      return;
    }

    const result = await authService.loginAdminUser(input);

    res.json({
      success: true,
      data: result,
      message: 'Login successful',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid credentials';
    res.status(401).json({ success: false, error: message });
  }
});

// Get current user (protected route)
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const user = await authService.getAdminUserById(req.user.userId);

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
