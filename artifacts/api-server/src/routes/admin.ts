import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, usersTable, experimentsTable, failuresTable, failureCommentsTable, commentsTable, commentReportsTable } from "@workspace/db";
import { eq, desc, ilike, or, count, sql } from "drizzle-orm";

const router: IRouter = Router();

/* ── Admin guard middleware ──────────────────────────────────────────────── */
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return; }
  const [user] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user?.isAdmin) { res.status(403).json({ error: "权限不足，仅管理员可访问" }); return; }
  next();
}

router.use("/admin", requireAdmin as any);

const PAGE_LIMIT = 20;

/* ── GET /admin/stats ────────────────────────────────────────────────────── */
router.get("/admin/stats", async (_req, res) => {
  try {
    const [[users], [experiments], [failures], [failureComments], [expComments], [reports]] = await Promise.all([
      db.select({ count: count() }).from(usersTable),
      db.select({ count: count() }).from(experimentsTable),
      db.select({ count: count() }).from(failuresTable),
      db.select({ count: count() }).from(failureCommentsTable),
      db.select({ count: count() }).from(commentsTable),
      db.select({ count: count() }).from(commentReportsTable),
    ]);
    res.json({
      users: Number(users.count),
      experiments: Number(experiments.count),
      failures: Number(failures.count),
      comments: Number(failureComments.count) + Number(expComments.count),
      reports: Number(reports.count),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /admin/users ────────────────────────────────────────────────────── */
router.get("/admin/users", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const search = (req.query.search as string) || "";
    const offset = (page - 1) * PAGE_LIMIT;

    const where = search
      ? or(ilike(usersTable.username, `%${search}%`), ilike(usersTable.displayName, `%${search}%`))
      : undefined;

    const [rows, [total]] = await Promise.all([
      db.select({
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        email: usersTable.email,
        researchField: usersTable.researchField,
        isAdmin: usersTable.isAdmin,
        createdAt: usersTable.createdAt,
      }).from(usersTable)
        .where(where)
        .orderBy(desc(usersTable.createdAt))
        .limit(PAGE_LIMIT).offset(offset),
      db.select({ count: count() }).from(usersTable).where(where),
    ]);

    res.json({ users: rows, total: Number(total.count), page, limit: PAGE_LIMIT });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── PATCH /admin/users/:id ─────────────────────────────────────────────── */
router.patch("/admin/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { isAdmin } = req.body as { isAdmin?: boolean };
    if (typeof isAdmin !== "boolean") { res.status(400).json({ error: "isAdmin 必须是布尔值" }); return; }
    await db.update(usersTable).set({ isAdmin }).where(eq(usersTable.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE /admin/users/:id ─────────────────────────────────────────────── */
router.delete("/admin/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const selfId = req.session?.userId;
    if (id === selfId) { res.status(400).json({ error: "不能删除自己的账号" }); return; }
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /admin/failures ─────────────────────────────────────────────────── */
router.get("/admin/failures", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const search = (req.query.search as string) || "";
    const offset = (page - 1) * PAGE_LIMIT;

    const where = search ? ilike(failuresTable.title, `%${search}%`) : undefined;

    const [rows, [total]] = await Promise.all([
      db.select({
        id: failuresTable.id,
        title: failuresTable.title,
        description: failuresTable.description,
        imageUrl: failuresTable.imageUrl,
        userId: failuresTable.userId,
        authorName: usersTable.displayName,
        createdAt: failuresTable.createdAt,
      }).from(failuresTable)
        .leftJoin(usersTable, eq(failuresTable.userId, usersTable.id))
        .where(where)
        .orderBy(desc(failuresTable.createdAt))
        .limit(PAGE_LIMIT).offset(offset),
      db.select({ count: count() }).from(failuresTable).where(where),
    ]);

    res.json({ failures: rows, total: Number(total.count), page, limit: PAGE_LIMIT });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE /admin/failures/:id ─────────────────────────────────────────── */
router.delete("/admin/failures/:id", async (req, res) => {
  try {
    await db.delete(failuresTable).where(eq(failuresTable.id, Number(req.params.id)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /admin/experiments ──────────────────────────────────────────────── */
router.get("/admin/experiments", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const search = (req.query.search as string) || "";
    const offset = (page - 1) * PAGE_LIMIT;

    const where = search ? ilike(experimentsTable.title, `%${search}%`) : undefined;

    const [rows, [total]] = await Promise.all([
      db.select({
        id: experimentsTable.id,
        title: experimentsTable.title,
        category: experimentsTable.category,
        failureReason: experimentsTable.failureReason,
        authorId: experimentsTable.authorId,
        authorName: usersTable.displayName,
        likeCount: experimentsTable.likeCount,
        commentCount: experimentsTable.commentCount,
        createdAt: experimentsTable.createdAt,
      }).from(experimentsTable)
        .leftJoin(usersTable, eq(experimentsTable.authorId, usersTable.id))
        .where(where)
        .orderBy(desc(experimentsTable.createdAt))
        .limit(PAGE_LIMIT).offset(offset),
      db.select({ count: count() }).from(experimentsTable).where(where),
    ]);

    res.json({ experiments: rows, total: Number(total.count), page, limit: PAGE_LIMIT });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE /admin/experiments/:id ──────────────────────────────────────── */
router.delete("/admin/experiments/:id", async (req, res) => {
  try {
    await db.delete(experimentsTable).where(eq(experimentsTable.id, Number(req.params.id)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /admin/comments ─────────────────────────────────────────────────── */
router.get("/admin/comments", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const offset = (page - 1) * PAGE_LIMIT;

    const failureAuthor = db.$with("fa").as(
      db.select({ id: usersTable.id, displayName: usersTable.displayName }).from(usersTable)
    );

    const [fcRows, [fcTotal]] = await Promise.all([
      db.select({
        id: failureCommentsTable.id,
        content: failureCommentsTable.content,
        authorName: usersTable.displayName,
        authorId: failureCommentsTable.userId,
        failureId: failureCommentsTable.failureId,
        failureTitle: failuresTable.title,
        type: sql<string>`'failure'`.as("type"),
        createdAt: failureCommentsTable.createdAt,
      }).from(failureCommentsTable)
        .leftJoin(usersTable, eq(failureCommentsTable.userId, usersTable.id))
        .leftJoin(failuresTable, eq(failureCommentsTable.failureId, failuresTable.id))
        .orderBy(desc(failureCommentsTable.createdAt))
        .limit(PAGE_LIMIT).offset(offset),
      db.select({ count: count() }).from(failureCommentsTable),
    ]);

    res.json({ comments: fcRows, total: Number(fcTotal.count), page, limit: PAGE_LIMIT });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE /admin/comments/:id ─────────────────────────────────────────── */
router.delete("/admin/comments/:id", async (req, res) => {
  try {
    await db.delete(failureCommentsTable).where(eq(failureCommentsTable.id, Number(req.params.id)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /admin/reports ──────────────────────────────────────────────────── */
router.get("/admin/reports", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const offset = (page - 1) * PAGE_LIMIT;

    const reporter = db.$with("reporter").as(
      db.select({ id: usersTable.id, displayName: usersTable.displayName }).from(usersTable)
    );

    const [rows, [total]] = await Promise.all([
      db.select({
        id: commentReportsTable.id,
        commentId: commentReportsTable.commentId,
        commentContent: failureCommentsTable.content,
        failureId: failureCommentsTable.failureId,
        failureTitle: failuresTable.title,
        reportReason: commentReportsTable.reportReason,
        reporterName: usersTable.displayName,
        reporterId: commentReportsTable.userId,
        createdAt: commentReportsTable.createdAt,
      }).from(commentReportsTable)
        .leftJoin(failureCommentsTable, eq(commentReportsTable.commentId, failureCommentsTable.id))
        .leftJoin(failuresTable, eq(failureCommentsTable.failureId, failuresTable.id))
        .leftJoin(usersTable, eq(commentReportsTable.userId, usersTable.id))
        .orderBy(desc(commentReportsTable.createdAt))
        .limit(PAGE_LIMIT).offset(offset),
      db.select({ count: count() }).from(commentReportsTable),
    ]);

    res.json({ reports: rows, total: Number(total.count), page, limit: PAGE_LIMIT });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE /admin/reports/:id ──── dismiss report ──────────────────────── */
router.delete("/admin/reports/:id", async (req, res) => {
  try {
    await db.delete(commentReportsTable).where(eq(commentReportsTable.id, Number(req.params.id)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE /admin/reports/:id/comment ── delete reported comment ──────── */
router.delete("/admin/reports/:id/comment", async (req, res) => {
  try {
    const reportId = Number(req.params.id);
    const [report] = await db.select({ commentId: commentReportsTable.commentId })
      .from(commentReportsTable).where(eq(commentReportsTable.id, reportId));
    if (!report) { res.status(404).json({ error: "举报不存在" }); return; }
    await db.delete(failureCommentsTable).where(eq(failureCommentsTable.id, report.commentId));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
