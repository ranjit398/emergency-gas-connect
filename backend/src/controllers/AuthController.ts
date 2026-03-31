import { Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import authService from './services/AuthService';
import { asyncHandler } from './middleware/index';
import { success } from './utils/response';

export class AuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, fullName, phone, role, latitude, longitude, address } = req.body;
    const result = await authService.register(email, password, fullName, phone, role, latitude, longitude, address);
    res.status(201).json(success({
      user: { id: result.user._id, email: result.user.email, role: result.user.role },
      profile: { fullName: result.profile.fullName, phone: result.profile.phone, role: result.profile.role },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }, 'Registration successful'));
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(success({
      user: { id: result.user._id, email: result.user.email, role: result.user.role },
      profile: {
        fullName: result.profile.fullName,
        phone: result.profile.phone,
        role: result.profile.role,
        address: result.profile.address,
        avatarUrl: result.profile.avatarUrl,
        isAvailable: result.profile.isAvailable,
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }, 'Login successful'));
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      const err = new Error('Refresh token required') as any;
      err.statusCode = 400;
      throw err;
    }
    const accessToken = await authService.refreshAccessToken(refreshToken);
    res.json(success({ accessToken }, 'Token refreshed'));
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    await authService.logout(req.userId!, refreshToken);
    res.json(success(null, 'Logged out successfully'));
  });

  getMe = asyncHandler(async (req: Request, res: Response) => {
    const Profile = (await import('@models/Profile')).default;
    const profile = await Profile.findOne({ userId: req.userId }).populate('userId', 'email role isActive');
    if (!profile) {
      const err = new Error('Profile not found') as any;
      err.statusCode = 404;
      throw err;
    }
    res.json(success({ user: req.user, profile }));
  });
}

export const registerValidation = [
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName')
    .trim().notEmpty().withMessage('Full name is required'),
  // ✅ checkFalsy:true means empty string, null, undefined all skip validation
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[0-9]{10,}$/).withMessage('Phone must be at least 10 digits'),
  body('role')
    .optional({ checkFalsy: true })
    .isIn(['seeker', 'helper', 'provider']).withMessage('Invalid role'),
  body('latitude')
    .optional({ checkFalsy: true })
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude')
    .optional({ checkFalsy: true })
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('address')
    .optional({ checkFalsy: true })
    .trim(),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

export default new AuthController();