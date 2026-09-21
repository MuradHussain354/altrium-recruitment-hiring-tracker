import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { CreateSavedFilterInput, UpdateSavedFilterInput } from '../schemas/batch2.schemas';

export class SavedFilterService {
  /**
   * Create a new private saved filter for the authenticated user.
   */
  static async createFilter(
    userId: string,
    input: CreateSavedFilterInput
  ) {
    const filter = await prisma.savedFilter.create({
      data: {
        userId,
        name: input.name,
        filterData: input.filterData
      }
    });

    return filter;
  }

  /**
   * List saved filters strictly owned by the authenticated user.
   */
  static async getMyFilters(userId: string) {
    return prisma.savedFilter.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Update a saved filter with strict ownership verification.
   */
  static async updateFilter(
    userId: string,
    filterId: string,
    input: UpdateSavedFilterInput
  ) {
    const filter = await prisma.savedFilter.findUnique({
      where: { id: filterId }
    });

    if (!filter) {
      throw new AppError(404, 'Saved filter not found.');
    }

    if (filter.userId !== userId) {
      throw new AppError(403, 'Access denied. You do not have permission to modify this saved filter.');
    }

    const updated = await prisma.savedFilter.update({
      where: { id: filterId },
      data: {
        name: input.name,
        filterData: input.filterData
      }
    });

    return updated;
  }

  /**
   * Delete a saved filter with strict ownership verification.
   */
  static async deleteFilter(
    userId: string,
    filterId: string
  ) {
    const filter = await prisma.savedFilter.findUnique({
      where: { id: filterId }
    });

    if (!filter) {
      throw new AppError(404, 'Saved filter not found.');
    }

    if (filter.userId !== userId) {
      throw new AppError(403, 'Access denied. You do not have permission to delete this saved filter.');
    }

    await prisma.savedFilter.delete({
      where: { id: filterId }
    });

    return { success: true, message: 'Saved filter deleted.' };
  }
}
