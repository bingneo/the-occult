import { pgTable, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { failuresTable } from "./failures";

export const failureLikesTable = pgTable("failure_likes", {
  id: serial("id").primaryKey(),
  failureId: integer("failure_id").notNull().references(() => failuresTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueFailureLike: unique().on(table.failureId, table.userId),
}));

export type FailureLike = typeof failureLikesTable.$inferSelect;
