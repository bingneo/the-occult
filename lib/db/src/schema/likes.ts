import { pgTable, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { experimentsTable } from "./experiments";

export const likesTable = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  experimentId: integer("experiment_id").notNull().references(() => experimentsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueLike: unique().on(table.userId, table.experimentId),
}));

export type Like = typeof likesTable.$inferSelect;
