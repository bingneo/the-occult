import { Router, type IRouter } from "express";
import { eq, sql, desc, and } from "drizzle-orm";
import { db, experimentsTable, usersTable, likesTable, commentsTable, collectionsTable } from "@workspace/db";
import { GetUserExperimentsParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users/:id/experiments", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetUserExperimentsParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(experimentsTable)
    .where(eq(experimentsTable.authorId, params.data.id))
    .orderBy(desc(experimentsTable.createdAt));

  const experiments = await Promise.all(rows.map(async (exp) => {
    const author = await db.select().from(usersTable).where(eq(usersTable.id, exp.authorId)).then(r => r[0]);
    const commentCount = await db.select({ count: sql<number>`count(*)::int` }).from(commentsTable).where(eq(commentsTable.experimentId, exp.id)).then(r => Number(r[0]?.count ?? 0));
    const likeCount = await db.select({ count: sql<number>`count(*)::int` }).from(likesTable).where(eq(likesTable.experimentId, exp.id)).then(r => Number(r[0]?.count ?? 0));
    let isLiked = false;
    let isCollected = false;
    if (userId) {
      const l = await db.select().from(likesTable).where(and(eq(likesTable.experimentId, exp.id), eq(likesTable.userId, userId)));
      isLiked = l.length > 0;
      const col = await db.select().from(collectionsTable).where(and(eq(collectionsTable.experimentId, exp.id), eq(collectionsTable.userId, userId)));
      isCollected = col.length > 0;
    }

    return {
      id: exp.id,
      title: exp.title,
      description: exp.description,
      category: exp.category,
      failureReason: exp.failureReason,
      hypothesis: exp.hypothesis ?? null,
      methodology: exp.methodology ?? null,
      lessonLearned: exp.lessonLearned ?? null,
      imageUrl: exp.imageUrl ?? null,
      likeCount,
      commentCount,
      isLiked,
      isCollected,
      authorId: exp.authorId,
      authorName: author?.displayName ?? "匿名",
      authorAvatar: author?.avatarUrl ?? null,
      createdAt: exp.createdAt.toISOString(),
      updatedAt: exp.updatedAt.toISOString(),
    };
  }));

  res.json(experiments);
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const targetId = parseInt(rawId, 10);
  if (isNaN(targetId)) {
    res.status(400).json({ error: "无效的用户 ID" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, targetId));
  if (!user) {
    res.status(404).json({ error: "用户不存在" });
    return;
  }

  const experimentCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(experimentsTable)
    .where(eq(experimentsTable.authorId, targetId))
    .then(r => Number(r[0]?.count ?? 0));

  const totalLikes = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(likesTable)
    .where(sql`${likesTable.experimentId} IN (SELECT id FROM experiments WHERE author_id = ${targetId})`)
    .then(r => Number(r[0]?.count ?? 0));

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio ?? null,
    researchField: user.researchField ?? null,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
    experimentCount,
    totalLikes,
  });
});

router.get("/users/:id/comments", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const targetId = parseInt(rawId, 10);
  if (isNaN(targetId)) {
    res.status(400).json({ error: "无效的用户 ID" });
    return;
  }

  const rows = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.authorId, targetId))
    .orderBy(desc(commentsTable.createdAt))
    .limit(50);

  const comments = await Promise.all(rows.map(async (c) => {
    const exp = await db
      .select({ id: experimentsTable.id, title: experimentsTable.title })
      .from(experimentsTable)
      .where(eq(experimentsTable.id, c.experimentId))
      .then(r => r[0]);
    return {
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      experimentId: c.experimentId,
      experimentTitle: exp?.title ?? "已删除的实验",
    };
  }));

  res.json(comments);
});

router.get("/users/:id/collections", async (req, res): Promise<void> => {
  const sessionUserId = req.session?.userId;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const targetId = parseInt(rawId, 10);
  if (isNaN(targetId)) {
    res.status(400).json({ error: "无效的用户 ID" });
    return;
  }

  const rows = await db
    .select({ exp: experimentsTable })
    .from(collectionsTable)
    .innerJoin(experimentsTable, eq(collectionsTable.experimentId, experimentsTable.id))
    .where(eq(collectionsTable.userId, targetId))
    .orderBy(desc(collectionsTable.createdAt));

  const experiments = await Promise.all(rows.map(async ({ exp }) => {
    const author = await db.select().from(usersTable).where(eq(usersTable.id, exp.authorId)).then(r => r[0]);
    const commentCount = await db.select({ count: sql<number>`count(*)::int` }).from(commentsTable).where(eq(commentsTable.experimentId, exp.id)).then(r => Number(r[0]?.count ?? 0));
    const likeCount = await db.select({ count: sql<number>`count(*)::int` }).from(likesTable).where(eq(likesTable.experimentId, exp.id)).then(r => Number(r[0]?.count ?? 0));
    let isLiked = false;
    if (sessionUserId) {
      const l = await db.select().from(likesTable).where(and(eq(likesTable.experimentId, exp.id), eq(likesTable.userId, sessionUserId)));
      isLiked = l.length > 0;
    }
    return {
      id: exp.id,
      title: exp.title,
      description: exp.description,
      category: exp.category,
      failureReason: exp.failureReason,
      hypothesis: exp.hypothesis ?? null,
      methodology: exp.methodology ?? null,
      lessonLearned: exp.lessonLearned ?? null,
      imageUrl: exp.imageUrl ?? null,
      likeCount,
      commentCount,
      isLiked,
      isCollected: true,
      authorId: exp.authorId,
      authorName: author?.displayName ?? "匿名",
      authorAvatar: author?.avatarUrl ?? null,
      createdAt: exp.createdAt.toISOString(),
      updatedAt: exp.updatedAt.toISOString(),
    };
  }));

  res.json(experiments);
});

export default router;
