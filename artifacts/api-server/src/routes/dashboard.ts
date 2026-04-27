import { Router, type IRouter } from "express";
import { and, desc, eq, sql, asc } from "drizzle-orm";
import { db, experimentsTable, commentsTable, collectionsTable, likesTable, usersTable, tagsTable, experimentTagsTable, failuresTable, failureCommentsTable, commentReportsTable } from "@workspace/db";

const router: IRouter = Router();

const requireAuth = (req: any, res: any): number | null => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return null; }
  return userId;
};

/* ── GET /dashboard/stats ──────────────────────────────────────────────── */
router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [
    experimentCountRow,
    commentCountRow,
    collectionCountRow,
    totalLikesRow,
    totalCommentCountRow,
    categoryRows,
    recentExperimentsRows,
    failureCountRow,
    failureLikeCountRow,
    failureCommentCountRow,
    reportCountRow,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(experimentsTable).where(eq(experimentsTable.authorId, userId)).then(r => r[0]),
    db.select({ count: sql<number>`count(*)::int` }).from(commentsTable).where(eq(commentsTable.authorId, userId)).then(r => r[0]),
    db.select({ count: sql<number>`count(*)::int` }).from(collectionsTable).where(eq(collectionsTable.userId, userId)).then(r => r[0]),
    db.select({ total: sql<number>`sum((select count(*)::int from likes where likes.experiment_id = experiments.id))` })
      .from(experimentsTable).where(eq(experimentsTable.authorId, userId)).then(r => r[0]),
    db.select({ total: sql<number>`sum((select count(*)::int from comments where comments.experiment_id = experiments.id))` })
      .from(experimentsTable).where(eq(experimentsTable.authorId, userId)).then(r => r[0]),
    db.select({ category: experimentsTable.category, count: sql<number>`count(*)::int` })
      .from(experimentsTable).where(eq(experimentsTable.authorId, userId))
      .groupBy(experimentsTable.category).orderBy(desc(sql`count(*)`)),
    db.select({
      id: experimentsTable.id, title: experimentsTable.title, createdAt: experimentsTable.createdAt,
      likeCount: sql<number>`(select count(*)::int from likes where likes.experiment_id = experiments.id)`,
      commentCount: sql<number>`(select count(*)::int from comments where comments.experiment_id = experiments.id)`,
    }).from(experimentsTable).where(eq(experimentsTable.authorId, userId)).orderBy(desc(experimentsTable.createdAt)).limit(6),
    db.select({ count: sql<number>`count(*)::int` }).from(failuresTable).where(eq(failuresTable.userId, userId)).then(r => r[0]),
    db.select({ total: sql<number>`sum((select count(*)::int from failure_likes where failure_likes.failure_id = failures.id))` })
      .from(failuresTable).where(eq(failuresTable.userId, userId)).then(r => r[0]),
    db.select({ total: sql<number>`sum((select count(*)::int from failure_comments where failure_comments.failure_id = failures.id))` })
      .from(failuresTable).where(eq(failuresTable.userId, userId)).then(r => r[0]),
    db.select({ count: sql<number>`count(*)::int` }).from(commentReportsTable).where(eq(commentReportsTable.userId, userId)).then(r => r[0]),
  ]);

  res.json({
    experimentCount: experimentCountRow?.count ?? 0,
    commentCount: commentCountRow?.count ?? 0,
    collectionCount: collectionCountRow?.count ?? 0,
    totalLikes: Number(totalLikesRow?.total ?? 0),
    totalCommentReceived: Number(totalCommentCountRow?.total ?? 0),
    categoryBreakdown: categoryRows,
    recentExperiments: recentExperimentsRows,
    failureCount: failureCountRow?.count ?? 0,
    failureLikeCount: Number(failureLikeCountRow?.total ?? 0),
    failureCommentCount: Number(failureCommentCountRow?.total ?? 0),
    reportCount: reportCountRow?.count ?? 0,
  });
});

/* ── GET /dashboard/experiments ────────────────────────────────────────── */
router.get("/dashboard/experiments", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
  const sortBy = (req.query.sortBy as string) || "newest";
  const offset = (page - 1) * limit;

  const orderBy = sortBy === "mostLiked"
    ? desc(sql`(select count(*) from likes where likes.experiment_id = experiments.id)`)
    : sortBy === "mostCommented"
    ? desc(sql`(select count(*) from comments where comments.experiment_id = experiments.id)`)
    : desc(experimentsTable.createdAt);

  const [rows, totalRow] = await Promise.all([
    db.select({
      id: experimentsTable.id,
      title: experimentsTable.title,
      description: experimentsTable.description,
      category: experimentsTable.category,
      failureReason: experimentsTable.failureReason,
      hypothesis: experimentsTable.hypothesis,
      methodology: experimentsTable.methodology,
      lessonLearned: experimentsTable.lessonLearned,
      imageUrl: experimentsTable.imageUrl,
      imagePaths: experimentsTable.imagePaths,
      videoUrls: experimentsTable.videoUrls,
      createdAt: experimentsTable.createdAt,
      updatedAt: experimentsTable.updatedAt,
      likeCount: sql<number>`(select count(*)::int from likes where likes.experiment_id = experiments.id)`,
      commentCount: sql<number>`(select count(*)::int from comments where comments.experiment_id = experiments.id)`,
      collectionCount: sql<number>`(select count(*)::int from user_collections where user_collections.experiment_id = experiments.id)`,
    })
      .from(experimentsTable)
      .where(eq(experimentsTable.authorId, userId))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(experimentsTable).where(eq(experimentsTable.authorId, userId)).then(r => r[0]),
  ]);

  res.json({ experiments: rows, total: totalRow?.count ?? 0, page, limit });
});

/* ── GET /dashboard/comments ───────────────────────────────────────────── */
router.get("/dashboard/comments", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
  const offset = (page - 1) * limit;

  const [rows, totalRow] = await Promise.all([
    db.select({
      id: commentsTable.id,
      content: commentsTable.content,
      createdAt: commentsTable.createdAt,
      experimentId: commentsTable.experimentId,
      parentId: commentsTable.parentId,
      experimentTitle: experimentsTable.title,
    })
      .from(commentsTable)
      .leftJoin(experimentsTable, eq(commentsTable.experimentId, experimentsTable.id))
      .where(eq(commentsTable.authorId, userId))
      .orderBy(desc(commentsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(commentsTable).where(eq(commentsTable.authorId, userId)).then(r => r[0]),
  ]);

  res.json({ comments: rows, total: totalRow?.count ?? 0, page, limit });
});

/* ── GET /dashboard/collections ─────────────────────────────────────────── */
router.get("/dashboard/collections", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
  const offset = (page - 1) * limit;

  const [rows, totalRow] = await Promise.all([
    db.select({
      id: experimentsTable.id,
      title: experimentsTable.title,
      description: experimentsTable.description,
      category: experimentsTable.category,
      failureReason: experimentsTable.failureReason,
      authorId: experimentsTable.authorId,
      authorName: usersTable.displayName,
      createdAt: experimentsTable.createdAt,
      likeCount: sql<number>`(select count(*)::int from likes where likes.experiment_id = experiments.id)`,
      commentCount: sql<number>`(select count(*)::int from comments where comments.experiment_id = experiments.id)`,
      collectedAt: collectionsTable.createdAt,
    })
      .from(collectionsTable)
      .innerJoin(experimentsTable, eq(collectionsTable.experimentId, experimentsTable.id))
      .leftJoin(usersTable, eq(experimentsTable.authorId, usersTable.id))
      .where(eq(collectionsTable.userId, userId))
      .orderBy(desc(collectionsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(collectionsTable).where(eq(collectionsTable.userId, userId)).then(r => r[0]),
  ]);

  res.json({ collections: rows, total: totalRow?.count ?? 0, page, limit });
});

/* ── GET /dashboard/reports ─────────────────────────────────────────────── */
router.get("/dashboard/reports", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
  const offset = (page - 1) * limit;

  const [rows, totalRow] = await Promise.all([
    db.select({
      id: commentReportsTable.id,
      reportReason: commentReportsTable.reportReason,
      createdAt: commentReportsTable.createdAt,
      commentId: commentReportsTable.commentId,
      commentContent: failureCommentsTable.content,
      failureId: failureCommentsTable.failureId,
      failureTitle: failuresTable.title,
    })
      .from(commentReportsTable)
      .leftJoin(failureCommentsTable, eq(commentReportsTable.commentId, failureCommentsTable.id))
      .leftJoin(failuresTable, eq(failureCommentsTable.failureId, failuresTable.id))
      .where(eq(commentReportsTable.userId, userId))
      .orderBy(desc(commentReportsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` })
      .from(commentReportsTable).where(eq(commentReportsTable.userId, userId)).then(r => r[0]),
  ]);

  res.json({
    reports: rows.map(r => ({
      id: r.id,
      reportReason: r.reportReason,
      createdAt: r.createdAt.toISOString(),
      commentId: r.commentId,
      commentContent: r.commentContent ?? "(评论已删除)",
      failureId: r.failureId ?? null,
      failureTitle: r.failureTitle ?? "(失败故事已删除)",
    })),
    total: totalRow?.count ?? 0,
    page,
    limit,
  });
});

/* ── GET /dashboard/failure-comments ───────────────────────────────────── */
router.get("/dashboard/failure-comments", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
  const offset = (page - 1) * limit;

  const [rows, totalRow] = await Promise.all([
    db.select({
      id: failureCommentsTable.id,
      content: failureCommentsTable.content,
      createdAt: failureCommentsTable.createdAt,
      failureId: failureCommentsTable.failureId,
      parentId: failureCommentsTable.parentId,
      failureTitle: failuresTable.title,
    })
      .from(failureCommentsTable)
      .leftJoin(failuresTable, eq(failureCommentsTable.failureId, failuresTable.id))
      .where(eq(failureCommentsTable.userId, userId))
      .orderBy(desc(failureCommentsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` })
      .from(failureCommentsTable).where(eq(failureCommentsTable.userId, userId)).then(r => r[0]),
  ]);

  res.json({
    comments: rows.map(r => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
      failureId: r.failureId,
      parentId: r.parentId ?? null,
      failureTitle: r.failureTitle ?? "(失败故事已删除)",
    })),
    total: totalRow?.count ?? 0,
    page,
    limit,
  });
});

export default router;
