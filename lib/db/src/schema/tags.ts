import { pgTable, text, serial, timestamp, integer, primaryKey } from "drizzle-orm/pg-core";
import { experimentsTable } from "./experiments";

export const tagsTable = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const experimentTagsTable = pgTable("experiment_tags", {
  experimentId: integer("experiment_id").notNull().references(() => experimentsTable.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tagsTable.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.experimentId, table.tagId] }),
}));

export type Tag = typeof tagsTable.$inferSelect;
export type ExperimentTag = typeof experimentTagsTable.$inferSelect;
