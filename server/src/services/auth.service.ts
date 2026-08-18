import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { signToken } from '../utils/jwt';
import { AppError } from '../utils/errors';
import { LoginInput } from '../schemas/auth.schema';
import { Role } from '@prisma/client';

export interface SafeUserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  teamId: string | null;
  createdById: string | null;
  createdAt: Date;
}

export interface AuthResponse {
  token: string;
  user: SafeUserProfile;
}

export class AuthService {
  static async login(input: LoginInput): Promise<AuthResponse> {
    const { email, password } = input;

    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      throw new AppError(401, 'Invalid email or password.');
    }

    // 2. Reject deactivated account
    if (!user.isActive) {
      throw new AppError(403, 'Account is deactivated. Please contact your Manager.');
    }

    // 3. Compare password hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email or password.');
    }

    // 4. Generate JWT
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // 5. Construct safe user profile (never expose passwordHash)
    const safeUser: SafeUserProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      teamId: user.teamId,
      createdById: user.createdById,
      createdAt: user.createdAt
    };

    return { token, user: safeUser };
  }

  static async getMe(userId: string): Promise<SafeUserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'User account is invalid or deactivated.');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      teamId: user.teamId,
      createdById: user.createdById,
      createdAt: user.createdAt
    };
  }
}
