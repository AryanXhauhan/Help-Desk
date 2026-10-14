import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { env } from '../config/env.js';
import { AuthenticatedRequest } from '../types/index.js';

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 15 * 60 * 1000, // 15 mins
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await AuthService.register(req.body);

      res.cookie('access_token', accessToken, ACCESS_COOKIE_OPTIONS);
      res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

      res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        data: { user, accessToken },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await AuthService.login(req.body);

      res.cookie('access_token', accessToken, ACCESS_COOKIE_OPTIONS);
      res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

      res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: { user, accessToken },
      });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
      const { user, accessToken, refreshToken: newRefreshToken } = await AuthService.refresh(refreshToken);

      res.cookie('access_token', accessToken, ACCESS_COOKIE_OPTIONS);
      res.cookie('refresh_token', newRefreshToken, REFRESH_COOKIE_OPTIONS);

      res.status(200).json({
        success: true,
        message: 'Token refreshed',
        data: { user, accessToken },
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
      await AuthService.logout(refreshToken);

      res.clearCookie('access_token', ACCESS_COOKIE_OPTIONS);
      res.clearCookie('refresh_token', REFRESH_COOKIE_OPTIONS);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getMe(req.user!.id);
      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.updateProfile(req.user!.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}
