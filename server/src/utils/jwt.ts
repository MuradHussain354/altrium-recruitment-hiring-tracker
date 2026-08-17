import jwt, { SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AppError } from './errors';

export interface TokenPayload {
  id: string;
  email: string;
  role: Role;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError(500, 'JWT_SECRET environment variable is not defined.');
  }
  return secret;
};

export const signToken = (payload: TokenPayload): string => {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const options: SignOptions = {
    expiresIn: expiresIn as any,
  };
  return jwt.sign(payload, secret, options);
};

export const verifyToken = (token: string): TokenPayload => {
  const secret = getJwtSecret();
  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError(401, 'Authentication token has expired.');
    }
    throw new AppError(401, 'Invalid authentication token.');
  }
};
