import { Router, type IRouter } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db, usersTable, passwordResetsTable } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { createHash, randomBytes } from "crypto";
import { sendPasswordResetEmail } from "../services/email.service";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "the-occult-salt").digest("hex");
}

function getUserExperimentCount(userId: number): Promise<number> {
  return db.query.experimentsTable
    .findMany({ where: (t, { eq }) => eq(t.authorId, userId) })
    .then((rows) => rows.length);
}

function formatUser(user: typeof usersTable.$inferSelect, experimentCount: number) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email ?? null,
    studentId: user.studentId ?? null,
    researchField: user.researchField ?? null,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    isAdmin: user.isAdmin ?? false,
    createdAt: user.createdAt.toISOString(),
    experimentCount,
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password, displayName, email, studentId, researchField } = parsed.data;

  if (!email || !email.trim()) {
    res.status(400).json({ error: "邮箱为必填项" });
    return;
  }
  const emailNorm = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailNorm)) {
    res.status(400).json({ error: "邮箱格式无效" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existing.length > 0) {
    res.status(409).json({ error: "该用户名已被占用，失败次数+1" });
    return;
  }

  const existingEmail = await db.select().from(usersTable).where(eq(usersTable.email, emailNorm));
  if (existingEmail.length > 0) {
    res.status(409).json({ error: "该邮箱已被注册，请使用其他邮箱" });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    username,
    passwordHash: hashPassword(password),
    displayName,
    email: emailNorm,
    studentId: studentId ?? null,
    researchField: researchField ?? null,
  }).returning();

  req.session = { userId: user.id };

  res.status(201).json({
    user: formatUser(user, 0),
    message: "欢迎加入神秘学！请开始分享你光荣的失败",
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "用户名或密码错误，但你的实验也可以失败嘛" });
    return;
  }

  req.session = { userId: user.id };

  const experimentCount = await getUserExperimentCount(user.id);

  res.json({
    user: formatUser(user, experimentCount),
    message: "欢迎回来，失败的勇士",
  });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session = null;
  res.json({ message: "退出成功，失败的道路还很长" });
});

/* ── PATCH /auth/profile — update own profile ──────────────────────────── */
router.patch("/auth/profile", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "请先登录" }); return; }

  const { displayName, researchField, email } = req.body ?? {};
  const updates: Partial<typeof usersTable.$inferInsert> = {};

  if (displayName !== undefined) {
    if (typeof displayName !== "string" || !displayName.trim()) {
      res.status(400).json({ error: "显示名称不能为空" }); return;
    }
    updates.displayName = displayName.trim();
  }

  if (researchField !== undefined) {
    updates.researchField = typeof researchField === "string" && researchField.trim() ? researchField.trim() : null;
  }

  if (email !== undefined) {
    if (!email || typeof email !== "string" || !email.trim()) {
      res.status(400).json({ error: "邮箱不能为空" }); return;
    }
    const emailNorm = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNorm)) {
      res.status(400).json({ error: "邮箱格式无效" }); return;
    }
    const [conflict] = await db.select().from(usersTable)
      .where(and(eq(usersTable.email, emailNorm)));
    if (conflict && conflict.id !== userId) {
      res.status(409).json({ error: "该邮箱已被其他账号使用" }); return;
    }
    updates.email = emailNorm;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "没有需要更新的内容" }); return;
  }

  await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
  const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const experimentCount = await getUserExperimentCount(userId);
  res.json({ user: formatUser(updated, experimentCount), message: "个人信息已更新" });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "未登录" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    req.session = null;
    res.status(401).json({ error: "用户不存在" });
    return;
  }

  const experimentCount = await getUserExperimentCount(user.id);
  res.json(formatUser(user, experimentCount));
});

/* ── POST /auth/forgot-password ────────────────────────────────────────── */
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "请提供有效的邮箱地址" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.trim().toLowerCase()));

  if (user) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.delete(passwordResetsTable).where(eq(passwordResetsTable.userId, user.id));
    await db.insert(passwordResetsTable).values({ userId: user.id, resetToken: token, expiresAt });

    try {
      await sendPasswordResetEmail({ toEmail: user.email!, toName: user.displayName, resetToken: token });
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }
  }

  res.json({ message: "如果该邮箱已注册，重置链接已发送到你的邮箱" });
});

/* ── POST /auth/reset-password ─────────────────────────────────────────── */
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { reset_token, new_password } = req.body ?? {};
  if (!reset_token || typeof reset_token !== "string") {
    res.status(400).json({ error: "无效的请求参数" });
    return;
  }
  if (!new_password || typeof new_password !== "string" || new_password.length < 6) {
    res.status(400).json({ error: "新密码至少需要 6 个字符" });
    return;
  }

  const [record] = await db
    .select()
    .from(passwordResetsTable)
    .where(
      and(
        eq(passwordResetsTable.resetToken, reset_token),
        gt(passwordResetsTable.expiresAt, new Date())
      )
    );

  if (!record) {
    res.status(400).json({ error: "重置链接无效或已过期，请重新申请" });
    return;
  }

  await db
    .update(usersTable)
    .set({ passwordHash: hashPassword(new_password) })
    .where(eq(usersTable.id, record.userId));

  await db.delete(passwordResetsTable).where(eq(passwordResetsTable.id, record.id));

  res.json({ message: "密码重置成功，请使用新密码登录" });
});

export default router;
