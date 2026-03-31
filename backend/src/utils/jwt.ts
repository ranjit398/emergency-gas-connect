import jwt from 'jsonwebtoken';
import config from './config/index';
import { JWTPayload, UserRole } from './types';

export const generateToken = (
  id: string,
  email: string,
  role: UserRole,
  expiresIn: string = config.jwt.expiry
): string => {
  const secret = config.jwt.secret as string;
  return jwt.sign({ id, email, role }, secret, {
    expiresIn,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
  const secret = config.jwt.secret as string;
  return jwt.verify(token, secret) as JWTPayload;
};

export const generateRefreshToken = (userId: string): string => {
  const secret = config.jwt.refreshSecret as string;
  return jwt.sign({ id: userId }, secret, {
    expiresIn: config.jwt.refreshExpiry,
  } as jwt.SignOptions);
};

export const verifyRefreshToken = (token: string): { id: string } => {
  const secret = config.jwt.refreshSecret as string;
  return jwt.verify(token, secret) as { id: string };
};
