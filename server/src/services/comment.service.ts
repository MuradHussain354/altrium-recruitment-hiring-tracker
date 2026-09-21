import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { Role, RecipientType, NotificationType } from '@prisma/client';

export class CommentService {
  /**
   * Add a comment to an application with structured @mentions parsing.
   */
  static async addComment(
    actor: { id: string; role: Role; name: string },
    applicationId: string,
    content: string
  ) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: { select: { name: true } },
        position: { select: { title: true } }
      }
    });

    if (!application) {
      throw new AppError(404, 'Application not found.');
    }

    // Parse @mentions from content (e.g. @Jane or @Jane Doe or @jane.doe)
    const mentionRegex = /@([a-zA-Z0-9_.-]+(?:\s[a-zA-Z0-9_.-]+)?)/g;
    const matches = Array.from(content.matchAll(mentionRegex), m => m[1].trim());

    // Resolve mentioned users from database
    let mentionedUserIds: string[] = [];
    if (matches.length > 0) {
      const users = await prisma.user.findMany({
        where: {
          OR: matches.map(name => ({
            name: { contains: name, mode: 'insensitive' }
          }))
        },
        select: { id: true }
      });
      mentionedUserIds = Array.from(new Set(users.map(u => u.id).filter(id => id !== actor.id)));
    }

    const comment = await prisma.$transaction(async (tx) => {
      const createdComment = await tx.applicationComment.create({
        data: {
          applicationId,
          authorId: actor.id,
          content
        },
        include: {
          author: { select: { id: true, name: true, role: true } },
          mentions: {
            include: {
              user: { select: { id: true, name: true } }
            }
          }
        }
      });

      // Insert mentions
      if (mentionedUserIds.length > 0) {
        await tx.commentMention.createMany({
          data: mentionedUserIds.map(userId => ({
            commentId: createdComment.id,
            userId
          }))
        });

        // Generate notifications for mentioned users
        for (const userId of mentionedUserIds) {
          await tx.notification.create({
            data: {
              applicationId,
              recipientType: RecipientType.User,
              recipientId: userId,
              type: NotificationType.FeedbackReminder
            }
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actionType: 'COMMENT_ADDED',
          entityType: 'ApplicationComment',
          entityId: createdComment.id,
          details: JSON.stringify({
            applicationId,
            mentionsCount: mentionedUserIds.length
          })
        }
      });

      return tx.applicationComment.findUnique({
        where: { id: createdComment.id },
        include: {
          author: { select: { id: true, name: true, role: true } },
          mentions: {
            include: {
              user: { select: { id: true, name: true } }
            }
          }
        }
      });
    });

    return comment;
  }

  /**
   * Get all comments for an application in chronological order.
   */
  static async getComments(applicationId: string) {
    return prisma.applicationComment.findMany({
      where: { applicationId },
      include: {
        author: { select: { id: true, name: true, role: true } },
        mentions: {
          include: {
            user: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Delete a comment. Author or Manager can delete.
   */
  static async deleteComment(
    actor: { id: string; role: Role },
    commentId: string
  ) {
    const comment = await prisma.applicationComment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      throw new AppError(404, 'Comment not found.');
    }

    if (actor.role !== Role.Manager && comment.authorId !== actor.id) {
      throw new AppError(403, 'Access denied. You can only delete your own comments.');
    }

    await prisma.applicationComment.delete({
      where: { id: commentId }
    });

    return { success: true, message: 'Comment deleted.' };
  }
}
