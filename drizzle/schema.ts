import { pgTable, text, numeric, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
});

export const projectorCheckpoint = pgTable('projector_checkpoint', {
    id: text('id').primaryKey(),
    name: text('name').unique().notNull(),
    commitPosition: numeric('commit_position').notNull(),
    preparePosition: numeric('prepare_position').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;

