import User, { IUser } from '@models/User';
import Profile, { IProfile } from '@models/Profile';
import Provider from '@models/Provider';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '@utils/jwt';
import { ValidationError, UnauthorizedError } from '@middleware/errorHandler';
import logger from '@utils/logger';

// Simple in-memory token blacklist — replace with Redis for multi-instance prod
const tokenBlacklist = new Set<string>();

export class AuthService {
  async register(
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    role?: string,
    latitude?: number,
    longitude?: number,
    address?: string
  ): Promise<{ user: IUser; profile: IProfile; accessToken: string; refreshToken: string }> {
    const existingUser = await User.findOne({ email });
    if (existingUser) throw new ValidationError('Email already registered');

    const safeRole = role === 'admin' ? 'seeker' : role || 'seeker';

    const user = await User.create({ email, password, role: safeRole });

    const profileData: any = {
      userId: user._id,
      fullName,
      phone: phone || '0000000000',
      role: safeRole,
      address: address || 'Not specified',
    };

    if (latitude !== undefined && longitude !== undefined) {
      profileData.location = {
        type: 'Point',
        coordinates: [longitude, latitude],
      };
    }

    const profile = await Profile.create(profileData);

    // ✅ Create Provider agency profile if registering as provider
    if (safeRole === 'provider') {
      const providerData: any = {
        userId: user._id,
        businessName: fullName, // Use fullName as business name for now
        businessType: 'LPG', // Default type
        location: {
          type: 'Point',
          coordinates: latitude !== undefined && longitude !== undefined ? [longitude, latitude] : [0, 0],
        },
        address: address || 'Not specified',
        contactNumber: phone || '0000000000',
        registrationNumber: `REG-${user._id}`,
        licenseNumber: `LIC-${user._id}`,
        licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        isVerified: false,
        operatingHours: { open: '08:00', close: '20:00' },
        availableCylinders: [
          { type: 'LPG', quantity: 10 },
          { type: 'CNG', quantity: 5 },
        ],
        rating: 0,
        totalRatings: 0,
        completedRequests: 0,
      };

      await Provider.create(providerData);
      logger.info(`Provider profile created for: ${email}`);
    }

    const accessToken = generateToken(user.id, user.email, user.role as any);
    const refreshToken = generateRefreshToken(user.id);

    logger.info(`New user registered: ${email} (${safeRole})`);

    return {
      user: user.toObject(),
      profile: profile.toObject(),
      accessToken,
      refreshToken,
    };
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: IUser; profile: IProfile; accessToken: string; refreshToken: string }> {
    const user = await User.findOne({ email }).select('+password');
    if (!user) throw new UnauthorizedError('Invalid email or password');

    if (!user.isActive) throw new UnauthorizedError('Account has been deactivated');

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) throw new UnauthorizedError('Invalid email or password');

    const profile = await Profile.findOne({ userId: user._id });
    if (!profile) throw new ValidationError('Profile not found. Please contact support.');

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const accessToken = generateToken(user.id, user.email, user.role as any);
    const refreshToken = generateRefreshToken(user.id);

    logger.info(`User logged in: ${email}`);

    return {
      user: user.toObject(),
      profile: profile.toObject(),
      accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    if (tokenBlacklist.has(refreshToken)) {
      throw new UnauthorizedError('Token has been revoked');
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.id);

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or account inactive');
    }

    return generateToken(user.id, user.email, user.role as any);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      tokenBlacklist.add(refreshToken); // Blacklist the refresh token
    }
    logger.info(`User logged out: ${userId}`);
  }

  isTokenBlacklisted(token: string): boolean {
    return tokenBlacklist.has(token);
  }
}

export default new AuthService();