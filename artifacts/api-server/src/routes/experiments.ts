import { Router, type IRouter } from "express";
import { eq, desc, sql, and, ilike, or } from "drizzle-orm";
import { db, experimentsTable, usersTable, commentsTable, likesTable, commentVotesTable, collectionsTable, tagsTable, experimentTagsTable, experimentCommentReportsTable } from "@workspace/db";
import { createCommentNotification } from "../services/notification.service";
import { sendCommentNotificationEmail } from "../services/email.service";
import {
  CreateExperimentBody,
  UpdateExperimentBody,
  GetExperimentParams,
  UpdateExperimentParams,
  DeleteExperimentParams,
  LikeExperimentParams,
  ListExperimentsQueryParams,
  ListCommentsParams,
  CreateCommentParams,
  CreateCommentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildExperimentResponse(exp: typeof experimentsTable.$inferSelect, userId?: number) {
  const [author, commentCountResult, likeCountResult, tagRows] = await Promise.all([
    db.select().from(usersTable).where(eq(usersTable.id, exp.authorId)).then(r => r[0]),
    db.select({ count: sql<number>`count(*)::int` }).from(commentsTable).where(eq(commentsTable.experimentId, exp.id)).then(r => r[0]),
    db.select({ count: sql<number>`count(*)::int` }).from(likesTable).where(eq(likesTable.experimentId, exp.id)).then(r => r[0]),
    db.select({ id: tagsTable.id, name: tagsTable.name })
      .from(experimentTagsTable)
      .innerJoin(tagsTable, eq(experimentTagsTable.tagId, tagsTable.id))
      .where(eq(experimentTagsTable.experimentId, exp.id))
      .orderBy(tagsTable.name),
  ]);
  const commentCount = commentCountResult?.count ?? 0;
  const likeCount = likeCountResult?.count ?? 0;
  let isLiked = false;
  let isCollected = false;
  if (userId) {
    const [likeRows, colRows] = await Promise.all([
      db.select().from(likesTable).where(and(eq(likesTable.experimentId, exp.id), eq(likesTable.userId, userId))),
      db.select().from(collectionsTable).where(and(eq(collectionsTable.experimentId, exp.id), eq(collectionsTable.userId, userId))),
    ]);
    isLiked = likeRows.length > 0;
    isCollected = colRows.length > 0;
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
    aiReport: exp.aiReport ?? null,
    imagePaths: exp.imagePaths ?? null,
    videoUrls: exp.videoUrls ?? null,
    likeCount: Number(likeCount),
    commentCount: Number(commentCount),
    isLiked,
    isCollected,
    tags: tagRows,
    authorId: exp.authorId,
    authorName: author?.displayName ?? "匿名失败者",
    authorAvatar: author?.avatarUrl ?? null,
    createdAt: exp.createdAt.toISOString(),
    updatedAt: exp.updatedAt.toISOString(),
  };
}

router.get("/experiments/trending", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  const exps = await db
    .select({
      exp: experimentsTable,
      likeCount: sql<number>`(select count(*)::int from likes where likes.experiment_id = experiments.id)`,
    })
    .from(experimentsTable)
    .orderBy(desc(sql`(select count(*) from likes where likes.experiment_id = experiments.id)`))
    .limit(6);

  const results = await Promise.all(exps.map(({ exp }) => buildExperimentResponse(exp, userId)));
  res.json(results);
});

router.get("/experiments", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  const parsed = ListExperimentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page, limit, category, search, sortBy, tag } = parsed.data;
  const offset = ((page ?? 1) - 1) * (limit ?? 10);

  const conditions = [];
  if (category) conditions.push(eq(experimentsTable.category, category));
  if (search) conditions.push(or(ilike(experimentsTable.title, `%${search}%`), ilike(experimentsTable.description, `%${search}%`)));
  if (tag) conditions.push(sql`${experimentsTable.id} IN (SELECT et.experiment_id FROM experiment_tags et JOIN tags t ON et.tag_id = t.id WHERE t.name = ${tag})`);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orderBy = sortBy === "mostLiked"
    ? desc(sql`(select count(*) from likes where likes.experiment_id = experiments.id)`)
    : sortBy === "mostCommented"
    ? desc(sql`(select count(*) from comments where comments.experiment_id = experiments.id)`)
    : desc(experimentsTable.createdAt);

  const [totalResult, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(experimentsTable).where(whereClause),
    db.select().from(experimentsTable).where(whereClause).orderBy(orderBy).limit(limit ?? 10).offset(offset),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  const experiments = await Promise.all(rows.map(exp => buildExperimentResponse(exp, userId)));

  res.json({
    experiments,
    total,
    page: page ?? 1,
    totalPages: Math.ceil(total / (limit ?? 10)),
  });
});

router.post("/experiments", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "请先登录" });
    return;
  }

  const parsed = CreateExperimentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [exp] = await db.insert(experimentsTable).values({
    ...parsed.data,
    authorId: userId,
  }).returning();

  const result = await buildExperimentResponse(exp, userId);
  res.status(201).json(result);
});

router.get("/experiments/:id", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetExperimentParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [exp] = await db.select().from(experimentsTable).where(eq(experimentsTable.id, params.data.id));
  if (!exp) {
    res.status(404).json({ error: "实验记录不存在，可能已被删除" });
    return;
  }

  const base = await buildExperimentResponse(exp, userId);

  const commentRows = await db.select().from(commentsTable).where(eq(commentsTable.experimentId, exp.id)).orderBy(commentsTable.createdAt);
  const comments = await Promise.all(commentRows.map(async (c) => {
    const author = await db.select().from(usersTable).where(eq(usersTable.id, c.authorId)).then(r => r[0]);
    const votes = await db.select().from(commentVotesTable).where(eq(commentVotesTable.commentId, c.id));
    const upvotes = votes.filter(v => v.vote === 1).length;
    const downvotes = votes.filter(v => v.vote === -1).length;
    const userVote = userId ? (votes.find(v => v.userId === userId)?.vote ?? 0) : 0;
    return {
      id: c.id,
      content: c.content,
      authorId: c.authorId,
      authorName: author?.displayName ?? "匿名",
      authorAvatar: author?.avatarUrl ?? null,
      experimentId: c.experimentId,
      parentId: c.parentId ?? null,
      createdAt: c.createdAt.toISOString(),
      upvotes,
      downvotes,
      userVote,
    };
  }));

  res.json({ ...base, comments });
});

router.patch("/experiments/:id", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "请先登录" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateExperimentParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateExperimentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(experimentsTable).where(eq(experimentsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "实验不存在" });
    return;
  }
  if (existing.authorId !== userId) {
    res.status(403).json({ error: "只能编辑自己的实验" });
    return;
  }

  const updates: Partial<typeof experimentsTable.$inferSelect> = {};
  if (parsed.data.title != null) updates.title = parsed.data.title;
  if (parsed.data.description != null) updates.description = parsed.data.description;
  if (parsed.data.category != null) updates.category = parsed.data.category;
  if (parsed.data.failureReason != null) updates.failureReason = parsed.data.failureReason;
  if (parsed.data.hypothesis !== undefined) updates.hypothesis = parsed.data.hypothesis;
  if (parsed.data.methodology !== undefined) updates.methodology = parsed.data.methodology;
  if (parsed.data.lessonLearned !== undefined) updates.lessonLearned = parsed.data.lessonLearned;
  if (parsed.data.imageUrl !== undefined) updates.imageUrl = parsed.data.imageUrl;
  if (parsed.data.aiReport !== undefined) updates.aiReport = parsed.data.aiReport;
  if (parsed.data.imagePaths !== undefined) updates.imagePaths = parsed.data.imagePaths ?? null;
  if (parsed.data.videoUrls !== undefined) updates.videoUrls = parsed.data.videoUrls ?? null;

  const [updated] = await db.update(experimentsTable).set(updates).where(eq(experimentsTable.id, params.data.id)).returning();
  const result = await buildExperimentResponse(updated, userId);
  res.json(result);
});

router.delete("/experiments/:id", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "请先登录" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteExperimentParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(experimentsTable).where(eq(experimentsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "实验不存在" });
    return;
  }
  if (existing.authorId !== userId) {
    res.status(403).json({ error: "只能删除自己的实验" });
    return;
  }

  await db.delete(commentsTable).where(eq(commentsTable.experimentId, params.data.id));
  await db.delete(likesTable).where(eq(likesTable.experimentId, params.data.id));
  await db.delete(experimentsTable).where(eq(experimentsTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/experiments/:id/like", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "请先登录" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = LikeExperimentParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const existing = await db.select().from(likesTable).where(and(eq(likesTable.experimentId, params.data.id), eq(likesTable.userId, userId)));

  let liked: boolean;
  if (existing.length > 0) {
    await db.delete(likesTable).where(and(eq(likesTable.experimentId, params.data.id), eq(likesTable.userId, userId)));
    liked = false;
  } else {
    await db.insert(likesTable).values({ userId, experimentId: params.data.id });
    liked = true;
  }

  const [likeCountResult] = await db.select({ count: sql<number>`count(*)::int` }).from(likesTable).where(eq(likesTable.experimentId, params.data.id));
  res.json({ liked, likeCount: Number(likeCountResult?.count ?? 0) });
});

router.get("/experiments/:id/comments", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ListCommentsParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const listUserId = req.session?.userId;
  const rows = await db.select().from(commentsTable).where(eq(commentsTable.experimentId, params.data.id)).orderBy(commentsTable.createdAt);
  const comments = await Promise.all(rows.map(async (c) => {
    const author = await db.select().from(usersTable).where(eq(usersTable.id, c.authorId)).then(r => r[0]);
    const votes = await db.select().from(commentVotesTable).where(eq(commentVotesTable.commentId, c.id));
    const upvotes = votes.filter(v => v.vote === 1).length;
    const downvotes = votes.filter(v => v.vote === -1).length;
    const userVote = listUserId ? (votes.find(v => v.userId === listUserId)?.vote ?? 0) : 0;
    return {
      id: c.id,
      content: c.content,
      authorId: c.authorId,
      authorName: author?.displayName ?? "匿名",
      authorAvatar: author?.avatarUrl ?? null,
      experimentId: c.experimentId,
      parentId: c.parentId ?? null,
      createdAt: c.createdAt.toISOString(),
      upvotes,
      downvotes,
      userVote,
    };
  }));

  res.json(comments);
});

router.post("/experiments/:id/comments", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "请先登录" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CreateCommentParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [comment] = await db.insert(commentsTable).values({
    content: parsed.data.content,
    authorId: userId,
    experimentId: params.data.id,
  }).returning();

  const [commenter, exp] = await Promise.all([
    db.select().from(usersTable).where(eq(usersTable.id, userId)).then(r => r[0]),
    db.select().from(experimentsTable).where(eq(experimentsTable.id, params.data.id)).then(r => r[0]),
  ]);

  if (exp && exp.authorId !== userId) {
    const commenterName = commenter?.displayName ?? "有人";

    createCommentNotification({
      recipientId: exp.authorId,
      commenterName,
      experimentTitle: exp.title,
      experimentId: exp.id,
      commentId: comment.id,
    }).catch((err) => console.error("[notification] Failed to create notification:", err));

    db.select()
      .from(usersTable)
      .where(eq(usersTable.id, exp.authorId))
      .then((rows) => {
        const expAuthor = rows[0];
        if (!expAuthor?.email) return;
        sendCommentNotificationEmail({
          toEmail: expAuthor.email,
          toName: expAuthor.displayName,
          commenterName,
          experimentTitle: exp.title,
          experimentId: exp.id,
          commentPreview:
            parsed.data.content.length > 100
              ? parsed.data.content.slice(0, 100) + "…"
              : parsed.data.content,
        }).catch((err) => console.error("[email] Failed to send notification:", err));
      })
      .catch((err) => console.error("[email] Failed to fetch experiment author:", err));
  }

  res.status(201).json({
    id: comment.id,
    content: comment.content,
    authorId: comment.authorId,
    authorName: commenter?.displayName ?? "匿名",
    authorAvatar: commenter?.avatarUrl ?? null,
    experimentId: comment.experimentId,
    createdAt: comment.createdAt.toISOString(),
    upvotes: 0,
    downvotes: 0,
    userVote: 0,
  });
});

router.post("/comments/:id/vote", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "请先登录" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const commentId = parseInt(rawId, 10);
  if (isNaN(commentId)) {
    res.status(400).json({ error: "无效的评论 ID" });
    return;
  }

  const { voteType } = req.body;
  if (voteType !== 1 && voteType !== -1) {
    res.status(400).json({ error: "voteType 必须是 1（赞）或 -1（踩）" });
    return;
  }

  const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, commentId));
  if (!comment) {
    res.status(404).json({ error: "评论不存在" });
    return;
  }

  const [existing] = await db.select().from(commentVotesTable).where(
    and(eq(commentVotesTable.commentId, commentId), eq(commentVotesTable.userId, userId))
  );

  if (existing) {
    if (existing.vote === voteType) {
      await db.delete(commentVotesTable).where(eq(commentVotesTable.id, existing.id));
    } else {
      await db.update(commentVotesTable).set({ vote: voteType }).where(eq(commentVotesTable.id, existing.id));
    }
  } else {
    await db.insert(commentVotesTable).values({ commentId, userId, vote: voteType });
  }

  const votes = await db.select().from(commentVotesTable).where(eq(commentVotesTable.commentId, commentId));
  const upvotes = votes.filter(v => v.vote === 1).length;
  const downvotes = votes.filter(v => v.vote === -1).length;
  const userVote = votes.find(v => v.userId === userId)?.vote ?? 0;

  res.json({ upvotes, downvotes, userVote });
});

/* ── DELETE /comments/:id ──────────────────────────────────────────────── */
router.delete("/comments/:id", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return; }

  const commentId = parseInt(req.params.id, 10);
  if (isNaN(commentId)) { res.status(400).json({ error: "无效的评论 ID" }); return; }

  const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, commentId));
  if (!comment) { res.status(404).json({ error: "评论不存在" }); return; }
  if (comment.authorId !== userId) { res.status(403).json({ error: "只能删除自己的评论" }); return; }

  await db.delete(commentsTable).where(eq(commentsTable.id, commentId));
  res.sendStatus(204);
});

/* ── GET /experiments/:id/tags ─────────────────────────────────────────── */
router.get("/experiments/:id/tags", async (req, res): Promise<void> => {
  const expId = parseInt(req.params.id, 10);
  if (isNaN(expId)) { res.status(400).json({ error: "无效的实验 ID" }); return; }
  const rows = await db
    .select({ id: tagsTable.id, name: tagsTable.name })
    .from(experimentTagsTable)
    .innerJoin(tagsTable, eq(experimentTagsTable.tagId, tagsTable.id))
    .where(eq(experimentTagsTable.experimentId, expId))
    .orderBy(tagsTable.name);
  res.json(rows);
});

/* ── POST /experiments/:id/tags ─────────────────────────────────────────── */
router.post("/experiments/:id/tags", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return; }

  const expId = parseInt(req.params.id, 10);
  if (isNaN(expId)) { res.status(400).json({ error: "无效的实验 ID" }); return; }

  const [exp] = await db.select().from(experimentsTable).where(eq(experimentsTable.id, expId));
  if (!exp) { res.status(404).json({ error: "实验不存在" }); return; }
  if (exp.authorId !== userId) { res.status(403).json({ error: "只有作者可以添加标签" }); return; }

  const tags: string[] = req.body?.tags;
  if (!Array.isArray(tags) || tags.length === 0) {
    res.status(400).json({ error: "请提供标签数组" }); return;
  }
  const cleanTags = tags.map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 10);

  for (const name of cleanTags) {
    let [tag] = await db.select().from(tagsTable).where(eq(tagsTable.name, name));
    if (!tag) {
      [tag] = await db.insert(tagsTable).values({ name }).returning();
    }
    await db.insert(experimentTagsTable).values({ experimentId: expId, tagId: tag.id }).onConflictDoNothing();
  }

  const rows = await db
    .select({ id: tagsTable.id, name: tagsTable.name })
    .from(experimentTagsTable)
    .innerJoin(tagsTable, eq(experimentTagsTable.tagId, tagsTable.id))
    .where(eq(experimentTagsTable.experimentId, expId))
    .orderBy(tagsTable.name);

  res.json(rows);
});

/* ── DELETE /experiments/:id/tags/:tagId ───────────────────────────────── */
router.delete("/experiments/:id/tags/:tagId", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return; }

  const expId = parseInt(req.params.id, 10);
  const tagId = parseInt(req.params.tagId, 10);
  if (isNaN(expId) || isNaN(tagId)) { res.status(400).json({ error: "无效的参数" }); return; }

  const [exp] = await db.select().from(experimentsTable).where(eq(experimentsTable.id, expId));
  if (!exp) { res.status(404).json({ error: "实验不存在" }); return; }
  if (exp.authorId !== userId) { res.status(403).json({ error: "只有作者可以删除标签" }); return; }

  await db.delete(experimentTagsTable).where(
    and(eq(experimentTagsTable.experimentId, expId), eq(experimentTagsTable.tagId, tagId))
  );
  res.json({ ok: true });
});

/* ── POST /comments/:id/reply ──────────────────────────────────────────── */
router.post("/comments/:id/reply", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return; }

  const parentId = parseInt(req.params.id, 10);
  if (isNaN(parentId)) { res.status(400).json({ error: "无效的评论 ID" }); return; }

  const content = req.body?.content;
  if (!content || typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "回复内容不能为空" }); return;
  }

  const [parent] = await db.select().from(commentsTable).where(eq(commentsTable.id, parentId));
  if (!parent) { res.status(404).json({ error: "评论不存在" }); return; }

  const [reply] = await db.insert(commentsTable).values({
    content: content.trim(),
    authorId: userId,
    experimentId: parent.experimentId,
    parentId,
  }).returning();

  const author = await db.select().from(usersTable).where(eq(usersTable.id, userId)).then(r => r[0]);

  res.status(201).json({
    id: reply.id,
    content: reply.content,
    authorId: reply.authorId,
    authorName: author?.displayName ?? "匿名",
    authorAvatar: author?.avatarUrl ?? null,
    experimentId: reply.experimentId,
    parentId: reply.parentId ?? null,
    createdAt: reply.createdAt.toISOString(),
    upvotes: 0,
    downvotes: 0,
    userVote: 0,
  });
});

/* ── POST /experiments/:id/collect — toggle collect ────────────────────── */
router.post("/experiments/:id/collect", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return; }

  const experimentId = parseInt(req.params.id, 10);
  if (isNaN(experimentId)) { res.status(400).json({ error: "无效的实验 ID" }); return; }

  const [exp] = await db.select().from(experimentsTable).where(eq(experimentsTable.id, experimentId));
  if (!exp) { res.status(404).json({ error: "实验不存在" }); return; }

  const [existing] = await db
    .select()
    .from(collectionsTable)
    .where(and(eq(collectionsTable.userId, userId), eq(collectionsTable.experimentId, experimentId)));

  if (existing) {
    await db.delete(collectionsTable).where(
      and(eq(collectionsTable.userId, userId), eq(collectionsTable.experimentId, experimentId))
    );
    res.json({ isCollected: false });
  } else {
    await db.insert(collectionsTable).values({ userId, experimentId });
    res.json({ isCollected: true });
  }
});

/* ── DELETE /experiments/:id/collect — remove collect ──────────────────── */
router.delete("/experiments/:id/collect", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return; }

  const experimentId = parseInt(req.params.id, 10);
  if (isNaN(experimentId)) { res.status(400).json({ error: "无效的实验 ID" }); return; }

  await db.delete(collectionsTable).where(
    and(eq(collectionsTable.userId, userId), eq(collectionsTable.experimentId, experimentId))
  );
  res.json({ isCollected: false });
});

/* ── POST /comments/:id/report — report an experiment comment ─────────── */
router.post("/comments/:id/report", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return; }

  const commentId = parseInt(req.params.id, 10);
  if (isNaN(commentId)) { res.status(400).json({ error: "无效评论 ID" }); return; }

  const { report_reason } = req.body ?? {};
  if (!report_reason || typeof report_reason !== "string") {
    res.status(400).json({ error: "请提供举报原因" }); return;
  }

  const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, commentId));
  if (!comment) { res.status(404).json({ error: "评论不存在" }); return; }
  if (comment.authorId === userId) { res.status(400).json({ error: "不能举报自己的评论" }); return; }

  const existing = await db.select().from(experimentCommentReportsTable)
    .where(and(eq(experimentCommentReportsTable.commentId, commentId), eq(experimentCommentReportsTable.userId, userId)));
  if (existing.length > 0) { res.status(409).json({ error: "你已经举报过这条评论了" }); return; }

  await db.insert(experimentCommentReportsTable).values({ commentId, userId, reportReason: report_reason });
  res.json({ success: true });
});

export default router;
