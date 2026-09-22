import jwt, { SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AppError } from './errors';

export interface TokenPayload {
  id: string;
  email: string;
  role: Role;
  type?: 'ACCESS';
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

export const verifyToken = (token: string): TokenPayload => {
  const secret = getJwtSecret();
  try {
    const decoded = jwt.verify(token, secret) as any;
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
