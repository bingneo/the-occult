import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, failuresTable, failureLikesTable, failureCommentsTable, commentReportsTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

async function buildFailureResponse(f: typeof failuresTable.$inferSelect, userId?: number) {
  const [author, likeCountRes, commentCountRes] = await Promise.all([
    db.select({ displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl })
      .from(usersTable).where(eq(usersTable.id, f.userId)).then(r => r[0]),
    db.select({ count: sql<number>`count(*)::int` }).from(failureLikesTable)
      .where(eq(failureLikesTable.failureId, f.id)).then(r => r[0]),
    db.select({ count: sql<number>`count(*)::int` }).from(failureCommentsTable)
      .where(eq(failureCommentsTable.failureId, f.id)).then(r => r[0]),
  ]);

  let isLiked = false;
  if (userId) {
    const rows = await db.select().from(failureLikesTable)
      .where(and(eq(failureLikesTable.failureId, f.id), eq(failureLikesTable.userId, userId)));
    isLiked = rows.length > 0;
  }

  return {
    id: f.id,
    title: f.title,
    description: f.description,
    imageUrl: f.imageUrl ?? null,
    videoUrl: f.videoUrl ?? null,
    userId: f.userId,
    authorName: author?.displayName ?? "匿名失败者",
    authorAvatar: author?.avatarUrl ?? null,
    likeCount: Number(likeCountRes?.count ?? 0),
    commentCount: Number(commentCountRes?.count ?? 0),
    isLiked,
    createdAt: f.createdAt.toISOString(),
  };
}

/* ── GET /failures/stats ────────────────────────────────────────────────── */
router.get("/failures/stats", async (_req, res): Promise<void> => {
  const [totalRes, todayRes] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(failuresTable).then(r => r[0]),
    db.select({ count: sql<number>`count(*)::int` }).from(failuresTable)
      .where(sql`created_at >= now() - interval '24 hours'`).then(r => r[0]),
  ]);
  res.json({
    total: Number(totalRes?.count ?? 0),
    today: Number(todayRes?.count ?? 0),
  });
});

/* ── GET /failures ──────────────────────────────────────────────────────── */
router.get("/failures", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 12));
  const offset = (page - 1) * limit;
  const mine = req.query.mine === "true";

  const where = mine && userId ? eq(failuresTable.userId, userId) : undefined;

  const [totalRes, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(failuresTable).where(where),
    db.select().from(failuresTable).where(where).orderBy(desc(failuresTable.createdAt)).limit(limit).offset(offset),
  ]);

  const total = Number(totalRes[0]?.count ?? 0);
  const failures = await Promise.all(rows.map(f => buildFailureResponse(f, userId)));

  res.json({ failures, total, page, limit, totalPages: Math.ceil(total / limit) });
});

/* ── POST /failures ─────────────────────────────────────────────────────── */
router.post("/failures", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return; }

  const { title, description, imageUrl, videoUrl } = req.body ?? {};
  if (!title?.trim()) { res.status(400).json({ error: "标题不能为空" }); return; }
  if (!description?.trim()) { res.status(400).json({ error: "内容不能为空" }); return; }
  if (title.trim().length > 200) { res.status(400).json({ error: "标题不能超过 200 字" }); return; }

  const [inserted] = await db.insert(failuresTable).values({
    userId,
    title: title.trim(),
    description: description.trim(),
    imageUrl: imageUrl?.trim() || null,
    videoUrl: videoUrl?.trim() || null,
  }).returning();

  const result = await buildFailureResponse(inserted, userId);
  res.status(201).json(result);
});

/* ── GET /failures/:id ──────────────────────────────────────────────────── */
router.get("/failures/:id", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "无效的 ID" }); return; }

  const [f] = await db.select().from(failuresTable).where(eq(failuresTable.id, id));
  if (!f) { res.status(404).json({ error: "失败故事不存在" }); return; }

  const result = await buildFailureResponse(f, userId);
  res.json(result);
});

/* ── DELETE /failures/:id ───────────────────────────────────────────────── */
router.delete("/failures/:id", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return; }

  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "无效的 ID" }); return; }

  const [f] = await db.select().from(failuresTable).where(eq(failuresTable.id, id));
  if (!f) { res.status(404).json({ error: "失败故事不存在" }); return; }

  const [user] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, userId));
  if (f.userId !== userId && !user?.isAdmin) {
    res.status(403).json({ error: "只能删除自己的失败故事" }); return;
  }

  await db.delete(failuresTable).where(eq(failuresTable.id, id));
  res.json({ ok: true });
});

/* ── POST /failures/:id/like ────────────────────────────────────────────── */
router.post("/failures/:id/like", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return; }

  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "无效的 ID" }); return; }

  const [existing] = await db.select().from(failureLikesTable)
    .where(and(eq(failureLikesTable.failureId, id), eq(failureLikesTable.userId, userId)));

  if (existing) {
    await db.delete(failureLikesTable).where(eq(failureLikesTable.id, existing.id));
  } else {
    await db.insert(failureLikesTable).values({ failureId: id, userId });
  }

  const [countRes] = await db.select({ count: sql<number>`count(*)::int` })
    .from(failureLikesTable).where(eq(failureLikesTable.failureId, id));
  res.json({ likeCount: Number(countRes?.count ?? 0), isLiked: !existing });
});

/* ── GET /failures/:id/comments ─────────────────────────────────────────── */
router.get("/failures/:id/comments", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "无效的 ID" }); return; }

  const rows = await db.select().from(failureCommentsTable)
    .where(eq(failureCommentsTable.failureId, id))
    .orderBy(failureCommentsTable.createdAt);

  const comments = await Promise.all(rows.map(async c => {
    const [author] = await db.select({ displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl })
      .from(usersTable).where(eq(usersTable.id, c.userId));
    return {
      id: c.id,
      content: c.content,
      userId: c.userId,
      parentId: c.parentId ?? null,
      authorName: author?.displayName ?? "匿名失败者",
      authorAvatar: author?.avatarUrl ?? null,
      createdAt: c.createdAt.toISOString(),
    };
  }));

  res.json({ comments });
});

/* ── POST /failures/:id/comment ─────────────────────────────────────────── */
router.post("/failures/:id/comment", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return; }

  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "无效的 ID" }); return; }

  const { comment } = req.body ?? {};
  if (!comment?.trim()) { res.status(400).json({ error: "评论内容不能为空" }); return; }
  if (comment.trim().length > 500) { res.status(400).json({ error: "评论不能超过 500 字" }); return; }

  const [failure] = await db.select().from(failuresTable).where(eq(failuresTable.id, id));
  if (!failure) { res.status(404).json({ error: "失败故事不存在" }); return; }

  const [inserted] = await db.insert(failureCommentsTable).values({
    failureId: id,
    userId,
    content: comment.trim(),
  }).returning();

  const [author] = await db.select({ displayName: usersTable.displayName })
    .from(usersTable).where(eq(usersTable.id, userId));

  res.status(201).json({
    id: inserted.id,
    content: inserted.content,
    userId: inserted.userId,
    parentId: null,
    authorName: author?.displayName ?? "匿名失败者",
    createdAt: inserted.createdAt.toISOString(),
  });
});

/* ── POST /failures/comments/:id/reply ──────────────────────────────────── */
router.post("/failures/comments/:id/reply", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return; }

  const parentId = Number(req.params.id);
  if (isNaN(parentId)) { res.status(400).json({ error: "无效的评论 ID" }); return; }

  const { content } = req.body ?? {};
  if (!content?.trim()) { res.status(400).json({ error: "回复内容不能为空" }); return; }
  if (content.trim().length > 500) { res.status(400).json({ error: "回复不能超过 500 字" }); return; }

  const [parent] = await db.select().from(failureCommentsTable).where(eq(failureCommentsTable.id, parentId));
  if (!parent) { res.status(404).json({ error: "父评论不存在" }); return; }

  const [inserted] = await db.insert(failureCommentsTable).values({
    failureId: parent.failureId,
    userId,
    content: content.trim(),
    parentId,
  }).returning();

  const [author] = await db.select({ displayName: usersTable.displayName })
    .from(usersTable).where(eq(usersTable.id, userId));

  res.status(201).json({
    id: inserted.id,
    content: inserted.content,
    userId: inserted.userId,
    parentId: inserted.parentId ?? null,
    failureId: inserted.failureId,
    authorName: author?.displayName ?? "匿名失败者",
    createdAt: inserted.createdAt.toISOString(),
  });
});

/* ── DELETE /failures/comments/:id ──────────────────────────────────────── */
router.delete("/failures/comments/:id", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return; }

  const commentId = Number(req.params.id);
  if (isNaN(commentId)) { res.status(400).json({ error: "无效的评论 ID" }); return; }

  const [comment] = await db.select().from(failureCommentsTable).where(eq(failureCommentsTable.id, commentId));
  if (!comment) { res.status(404).json({ error: "评论不存在" }); return; }
  if (comment.userId !== userId) { res.status(403).json({ error: "只能删除自己的评论" }); return; }

  await db.delete(failureCommentsTable).where(eq(failureCommentsTable.id, commentId));
  res.json({ message: "评论已删除" });
});

/* ── POST /failures/comments/:id/report ─────────────────────────────────── */
router.post("/failures/comments/:id/report", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return; }

  const commentId = Number(req.params.id);
  if (isNaN(commentId)) { res.status(400).json({ error: "无效的评论 ID" }); return; }

  const { report_reason } = req.body ?? {};
  if (!report_reason?.trim()) { res.status(400).json({ error: "请提供举报原因" }); return; }
  if (report_reason.trim().length > 200) { res.status(400).json({ error: "举报原因不能超过 200 字" }); return; }

  const [comment] = await db.select().from(failureCommentsTable).where(eq(failureCommentsTable.id, commentId));
  if (!comment) { res.status(404).json({ error: "评论不存在" }); return; }

  if (comment.userId === userId) { res.status(400).json({ error: "不能举报自己的评论" }); return; }

  const [existing] = await db.select().from(commentReportsTable)
    .where(and(eq(commentReportsTable.commentId, commentId), eq(commentReportsTable.userId, userId)));
  if (existing) { res.status(409).json({ error: "你已经举报过该评论了" }); return; }

  await db.insert(commentReportsTable).values({
    commentId,
    userId,
    reportReason: report_reason.trim(),
  });

  res.status(201).json({ message: "举报已提交，感谢你的反馈" });
});

/* ── GET /failures/comments/:id/reports (admin/owner view) ──────────────── */
router.get("/failures/comments/:id/reports", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return; }

  const commentId = Number(req.params.id);
  if (isNaN(commentId)) { res.status(400).json({ error: "无效的评论 ID" }); return; }

  const rows = await db.select().from(commentReportsTable)
    .where(eq(commentReportsTable.commentId, commentId));

  res.json({
    commentId,
    reportCount: rows.length,
    reports: rows.map(r => ({
      id: r.id,
      reportReason: r.reportReason,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

export default router;
