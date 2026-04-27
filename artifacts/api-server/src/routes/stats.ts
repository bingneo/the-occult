import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, experimentsTable, usersTable, commentsTable, likesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats/overview", async (_req, res): Promise<void> => {
  const [expCount, userCount, commentCount, likeCount, topField] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(experimentsTable).then(r => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable).then(r => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)::int` }).from(commentsTable).then(r => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)::int` }).from(likesTable).then(r => Number(r[0]?.count ?? 0)),
    db
      .select({ field: usersTable.researchField, count: sql<number>`count(*)::int` })
      .from(usersTable)
      .groupBy(usersTable.researchField)
      .orderBy(sql`count(*) desc`)
      .limit(1)
      .then(r => r[0]?.field ?? null),
  ]);

  res.json({
    totalExperiments: expCount,
    totalUsers: userCount,
    totalComments: commentCount,
    totalLikes: likeCount,
    mostActiveResearchField: topField,
  });
});

router.get("/stats/failure-reasons", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ reason: experimentsTable.failureReason, count: sql<number>`count(*)::int` })
    .from(experimentsTable)
    .groupBy(experimentsTable.failureReason)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  res.json(rows.map(r => ({ reason: r.reason, count: Number(r.count) })));
});

router.get("/stats/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ category: experimentsTable.category, count: sql<number>`count(*)::int` })
    .from(experimentsTable)
    .groupBy(experimentsTable.category)
    .orderBy(sql`count(*) desc`);

  res.json(rows.map(r => ({ category: r.category, count: Number(r.count) })));
});

export default router;
