import { Router, type IRouter } from "express";
import { db, rantsTable, usersTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";

const router: IRouter = Router();

const AVATARS = ["🐼","🦉","🐸","🦊","🐙","🦁","🐺","🐰","🦋","🐨","🦑","🐳","🦝","🐯","🦔","🐧","🦕","🐬","🦅","🐻"];
const FIELDS = ["Chemistry","Biology","Physics","CS","Materials","Psychology","Ecology","Neuroscience","Math","Biochem","Marine","Other"];

function avatarFor(id: number) { return AVATARS[id % AVATARS.length]; }
function fieldFor(id: number) { return FIELDS[id % FIELDS.length]; }

router.get("/rants", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: rantsTable.id,
      text: rantsTable.text,
      userId: rantsTable.userId,
      userName: usersTable.username,
      createdAt: rantsTable.createdAt,
    })
    .from(rantsTable)
    .leftJoin(usersTable, eq(rantsTable.userId, usersTable.id))
    .orderBy(desc(rantsTable.createdAt))
    .limit(50);

  const rants = rows.map(r => ({
    id: String(r.id),
    text: r.text,
    name: r.userName ?? "匿名研究员",
    avatar: avatarFor(r.id),
    field: fieldFor(r.userId ?? r.id),
    time: formatTime(r.createdAt),
  }));

  res.json({ rants });
});

router.post("/rants", async (req, res): Promise<void> => {
  const userId = req.session?.userId ?? null;
  const { text } = req.body ?? {};
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "吐槽内容不能为空" });
    return;
  }
  const trimmed = text.trim().slice(0, 200);
  const [rant] = await db.insert(rantsTable).values({ text: trimmed, userId }).returning();
  res.json({
    id: String(rant.id),
    text: rant.text,
    name: "匿名研究员",
    avatar: avatarFor(rant.id),
    field: fieldFor(rant.userId ?? rant.id),
    time: "刚刚",
  });
});

function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}天前`;
  return date.toLocaleDateString("zh-CN");
}

export default router;
