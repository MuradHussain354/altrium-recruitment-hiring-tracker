import prisma from '../config/prisma';
import crypto from 'crypto';
import { AppError } from '../utils/errors';
import { JobAlertSubscriptionInput } from '../schemas/job-alert.schema';

export class JobAlertService {
  /**
   * Subscribe to Job Alerts
   * Validates and normalizes email, saves optional department and keyword preferences,
   * generates a secure unguessable unsubscribe token, and returns a safe confirmation
   * without exposing the unsubscribe token in public response.
   */
  static async subscribe(input: JobAlertSubscriptionInput) {
    const normalizedEmail = input.email.toLowerCase().trim();
    const department = input.department ? input.department.trim() : null;
    const keyword = input.keyword ? input.keyword.trim() : null;

    // Check if an identical active subscription already exists
    const existingActive = await prisma.jobAlertSubscription.findFirst({
      where: {
        email: normalizedEmail,
        department,
        keyword,
        isActive: true
      }
    });

    if (existingActive) {
      return {
        id: existingActive.id,
        email: existingActive.email,
        department: existingActive.department,
        keyword: existingActive.keyword,
        isActive: existingActive.isActive,
        createdAt: existingActive.createdAt
      };
    }

    // Check if an identical inactive subscription exists and reactivate it
    const existingInactive = await prisma.jobAlertSubscription.findFirst({
      where: {
        email: normalizedEmail,
        department,
        keyword,
        isActive: false
      }
    });

    if (existingInactive) {
      const reactivated = await prisma.jobAlertSubscription.update({
        where: { id: existingInactive.id },
        data: {
          isActive: true,
          // Generate a fresh unguessable token upon reactivation
          unsubscribeToken: crypto.randomUUID()
        }
      });

      return {
        id: reactivated.id,
        email: reactivated.email,
        department: reactivated.department,
        keyword: reactivated.keyword,
        isActive: reactivated.isActive,
        createdAt: reactivated.createdAt
      };
    }

    // Create new subscription record with secure random unguessable token
    const subscription = await prisma.jobAlertSubscription.create({
      data: {
        email: normalizedEmail,
        department,
        keyword,
        unsubscribeToken: crypto.randomUUID(),
        isActive: true
      }
    });

    // Return safe confirmation without leaking unsubscribeToken
    return {
      id: subscription.id,
      email: subscription.email,
      department: subscription.department,
      keyword: subscription.keyword,
      isActive: subscription.isActive,
      createdAt: subscription.createdAt
    };
  }

  /**
   * Unsubscribe from Job Alerts
   * Validates unguessable token and deactivates subscription safely.
   * Handles repeated unsubscribes gracefully.
   */
  static async unsubscribe(token: string) {
    if (!token || typeof token !== 'string' || !token.trim()) {
      throw new AppError(400, 'Unsubscribe token is required.');
    }

    const trimmedToken = token.trim();

    const subscription = await prisma.jobAlertSubscription.findUnique({
      where: { unsubscribeToken: trimmedToken }
    });

    if (!subscription) {
      throw new AppError(404, 'Subscription not found or invalid token.');
    }

    if (!subscription.isActive) {
      return {
        message: 'Subscription is already inactive.',
        isActive: false
      };
    }

    await prisma.jobAlertSubscription.update({
      where: { id: subscription.id },
      data: { isActive: false }
    });

    return {
      message: 'Successfully unsubscribed from job alerts.',
      isActive: false
    };
  }
}
