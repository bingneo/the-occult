import { pgTable, timestamp, integer, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { experimentsTable } from "./experiments";

export const collectionsTable = pgTable("user_collections", {
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  experimentId: integer("experiment_id").notNull().references(() => experimentsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.experimentId] }),
}));

export type Collection = typeof collectionsTable.$inferSelect;
