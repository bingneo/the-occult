import { pgTable, text, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { commentsTable } from "./comments";

export const experimentCommentReportsTable = pgTable("experiment_comment_reports", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => commentsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  reportReason: text("report_reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueReport: unique().on(table.commentId, table.userId),
}));

export type ExperimentCommentReport = typeof experimentCommentReportsTable.$inferSelect;
