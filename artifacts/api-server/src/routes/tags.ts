import { Router, type IRouter } from "express";
import { desc, sql } from "drizzle-orm";
import { db, tagsTable, experimentTagsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/tags", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: tagsTable.id,
      name: tagsTable.name,
      count: sql<number>`(select count(*)::int from experiment_tags where experiment_tags.tag_id = tags.id)`,
    })
    .from(tagsTable)
    .orderBy(desc(sql`(select count(*) from experiment_tags where experiment_tags.tag_id = tags.id)`));

  res.json(rows);
});

export default router;
