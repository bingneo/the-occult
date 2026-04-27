import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { failuresTable } from "./failures";

export const failureCommentsTable = pgTable("failure_comments", {
  id: serial("id").primaryKey(),
  failureId: integer("failure_id").notNull().references(() => failuresTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentId: integer("parent_id").references((): any => failureCommentsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FailureComment = typeof failureCommentsTable.$inferSelect;
