import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Fitness ─────────────────────────────────────────────────────────────────

export const exercises = sqliteTable("exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category", {
    enum: ["push", "pull", "legs", "core", "cardio", "other"],
  }).notNull(),
  muscleGroups: text("muscle_groups").notNull(), // JSON string: string[]
  secondaryMuscles: text("secondary_muscles").notNull().default("[]"), // JSON string: string[]
  isCustom: integer("is_custom", { mode: "boolean" }).notNull().default(false),
});

export const workoutSessions = sqliteTable("workout_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // ISO date string YYYY-MM-DD
  notes: text("notes"),
  durationMins: integer("duration_mins"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const workoutSets = sqliteTable("workout_sets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => workoutSessions.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercises.id),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps").notNull(),
  weightKg: real("weight_kg").notNull(),
  rpe: integer("rpe"), // 1-10, optional perceived exertion
});

// ─── Finance ──────────────────────────────────────────────────────────────────

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["checking", "savings", "credit", "investment"],
  }).notNull(),
  currency: text("currency").notNull().default("USD"),
});

export const transactionCategories = sqliteTable("transaction_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  parentCategory: text("parent_category"),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
});

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").references(() => accounts.id),
  date: text("date").notNull(), // YYYY-MM-DD
  amount: real("amount").notNull(), // positive = income, negative = expense
  category: text("category"),
  description: text("description").notNull(),
  rawDescription: text("raw_description"), // original bank description
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ─── Mood & Mental Health ─────────────────────────────────────────────────────

export const dailyEntries = sqliteTable("daily_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(), // YYYY-MM-DD, one per day
  moodScore: integer("mood_score").notNull(), // 1-10
  energyScore: integer("energy_score").notNull(), // 1-10
  stressScore: integer("stress_score").notNull(), // 1-10
  notes: text("notes"),
  gratitude: text("gratitude"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ─── Habits & Goals ───────────────────────────────────────────────────────────

export const habits = sqliteTable("habits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  frequency: text("frequency", { enum: ["daily", "weekly"] })
    .notNull()
    .default("daily"),
  targetDaysPerWeek: integer("target_days_per_week").notNull().default(7),
  color: text("color").notNull().default("#6366f1"), // hex color
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const habitLogs = sqliteTable("habit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  habitId: integer("habit_id")
    .notNull()
    .references(() => habits.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  completed: integer("completed", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
});

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: text("target_date"), // YYYY-MM-DD
  status: text("status", { enum: ["active", "completed", "paused"] })
    .notNull()
    .default("active"),
  category: text("category"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const goalMilestones = sqliteTable("goal_milestones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  completedAt: text("completed_at"),
});

// ─── Projects & Issues (ticketing system) ─────────────────────────────────────

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category", {
    enum: ["project", "certification", "career", "personal"],
  }).notNull().default("project"),
  color: text("color").notNull().default("#8b5cf6"),
  status: text("status", {
    enum: ["active", "paused", "completed", "archived"],
  }).notNull().default("active"),
  targetDate: text("target_date"), // YYYY-MM-DD
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const issues = sqliteTable("issues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["backlog", "todo", "in_progress", "in_review", "done", "cancelled"],
  }).notNull().default("todo"),
  priority: text("priority", {
    enum: ["urgent", "high", "medium", "low", "none"],
  }).notNull().default("none"),
  label: text("label"),   // free-text tag e.g. "bug", "feature", "study"
  dueDate: text("due_date"), // YYYY-MM-DD
  sortOrder: integer("sort_order").notNull().default(0),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});
