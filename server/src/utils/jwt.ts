import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AppError } from './errors';

export interface TokenPayload {
  id: string;
  email: string;
  role: Role;
  type?: 'ACCESS';
}

export interface TwoFactorTempTokenPayload {
  sub: string;
  type: '2FA_PENDING';
  jti: string;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError(500, 'JWT_SECRET environment variable is not defined.');
  }
  return secret;
};

export const signToken = (payload: Omit<TokenPayload, 'type'>): string => {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const fullPayload: TokenPayload = {
    ...payload,
    type: 'ACCESS',
  };
  const options: SignOptions = {
    expiresIn: expiresIn as any,
  };
  return jwt.sign(fullPayload, secret, options);
};

export const signTwoFactorTempToken = (userId: string): string => {
  const secret = getJwtSecret();
  const payload: TwoFactorTempTokenPayload = {
    sub: userId,
    type: '2FA_PENDING',
    jti: crypto.randomUUID(),
  };
  return jwt.sign(payload, secret, { expiresIn: '5m' });
};

export const verifyToken = (token: string): TokenPayload => {
  const secret = getJwtSecret();
  try {
    const decoded = jwt.verify(token, secret) as any;
    if (decoded.type === '2FA_PENDING') {
      throw new AppError(401, 'Invalid authentication token: two-factor authentication pending.');
    }
    if (decoded.type && decoded.type !== 'ACCESS') {
      throw new AppError(401, 'Invalid authentication token.');
    }
    if (!decoded.id || !decoded.role) {
      throw new AppError(401, 'Invalid authentication token.');
    }
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      type: 'ACCESS',
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    if (error.name === 'TokenExpiredError') {
      throw new AppError(401, 'Authentication token has expired.');
    }
    throw new AppError(401, 'Invalid authentication token.');
  }
};

export const verify2FATempToken = (token: string): TwoFactorTempTokenPayload => {
  const secret = getJwtSecret();
  try {
    const decoded = jwt.verify(token, secret) as any;
    if (decoded.type !== '2FA_PENDING' || !decoded.sub || !decoded.jti) {
      throw new AppError(401, 'Invalid authentication token: expected two-factor challenge token.');
    }
    return {
      sub: decoded.sub,
      type: '2FA_PENDING',
      jti: decoded.jti,
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    if (error.name === 'TokenExpiredError') {
      throw new AppError(401, 'Two-factor authentication session has expired. Please sign in again.');
    }
    throw new AppError(401, 'Invalid authentication token.');
  }
};
