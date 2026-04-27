import { pgTable, serial, integer, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { experimentsTable } from "./experiments";
import { commentsTable } from "./comments";

export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    content: text("content").notNull(),
    experimentId: integer("experiment_id").references(() => experimentsTable.id, {
      onDelete: "cascade",
    }),
    commentId: integer("comment_id").references(() => commentsTable.id, {
      onDelete: "cascade",
    }),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("notifications_user_comment_unique").on(table.userId, table.commentId),
  ]
);

export type Notification = typeof notificationsTable.$inferSelect;
