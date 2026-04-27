import { db, notificationsTable } from "@workspace/db";

export interface CommentNotificationParams {
  recipientId: number;
  commenterName: string;
  experimentTitle: string;
  experimentId: number;
  commentId: number;
}

export async function createCommentNotification(
  params: CommentNotificationParams
): Promise<void> {
  const { recipientId, commenterName, experimentTitle, experimentId, commentId } = params;

  await db
    .insert(notificationsTable)
    .values({
      userId: recipientId,
      type: "comment",
      content: `${commenterName} 评论了你的实验《${experimentTitle}》`,
      experimentId,
      commentId,
    })
    .onConflictDoNothing();
}
