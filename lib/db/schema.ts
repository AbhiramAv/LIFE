import { pgTable, text, integer, real, boolean, serial } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Fitness ─────────────────────────────────────────────────────────────────

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // push|pull|legs|core|cardio|other
  muscleGroups: text("muscle_groups").notNull(),
  secondaryMuscles: text("secondary_muscles").notNull().default("[]"),
  isCustom: boolean("is_custom").notNull().default(false),
});

export const workoutSessions = pgTable("workout_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  notes: text("notes"),
  durationMins: integer("duration_mins"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const workoutSets = pgTable("workout_sets", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").notNull().references(() => exercises.id),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps").notNull(),
  weightKg: real("weight_kg").notNull(),
  rpe: integer("rpe"),
});

// ─── Finance ──────────────────────────────────────────────────────────────────

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // checking|savings|credit|investment
  currency: text("currency").notNull().default("USD"),
});

export const transactionCategories = pgTable("transaction_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  parentCategory: text("parent_category"),
  type: text("type").notNull(), // income|expense
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  accountId: integer("account_id").references(() => accounts.id),
  date: text("date").notNull(),
  amount: real("amount").notNull(),
  category: text("category"),
  description: text("description").notNull(),
  rawDescription: text("raw_description"),
  type: text("type").notNull(), // income|expense
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// ─── Mood & Mental Health ─────────────────────────────────────────────────────

export const dailyEntries = pgTable("daily_entries", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  moodScore: integer("mood_score").notNull(),
  energyScore: integer("energy_score").notNull(),
  stressScore: integer("stress_score").notNull(),
  notes: text("notes"),
  gratitude: text("gratitude"),
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

// ─── Habits ───────────────────────────────────────────────────────────────────

export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  biggerGoal: text("bigger_goal"),          // overarching goal this habit serves (board display title)
  frequency: text("frequency").notNull().default("daily"), // daily|weekly
  targetDaysPerWeek: integer("target_days_per_week").notNull().default(7),
  color: text("color").notNull().default("#6366f1"),
  archived: boolean("archived").notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const habitLogs = pgTable("habit_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  habitId: integer("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  completed: boolean("completed").notNull().default(true),
  logStatus: text("log_status").notNull().default("completed"), // completed|skipped|missed
  notes: text("notes"),
});

// ─── Goals (legacy) ───────────────────────────────────────────────────────────

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: text("target_date"),
  status: text("status").notNull().default("active"), // active|completed|paused
  category: text("category"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const goalMilestones = pgTable("goal_milestones", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: text("completed_at"),
});

// ─── Projects & Issues ────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("project"), // project|certification|career|personal
  color: text("color").notNull().default("#8b5cf6"),
  status: text("status").notNull().default("active"), // active|paused|completed|archived
  targetDate: text("target_date"),
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"), // backlog|todo|in_progress|in_review|done|cancelled|skipped
  priority: text("priority").notNull().default("none"), // urgent|high|medium|low|none
  label: text("label"),
  dueDate: text("due_date"),
  sortOrder: integer("sort_order").notNull().default(0),
  inSprint: boolean("in_sprint").notNull().default(false), // on the current week's board
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

// ─── User Profiles ────────────────────────────────────────────────────────────

export const userProfiles = pgTable("user_profiles", {
  id:        text("id").primaryKey(),
  email:     text("email").notNull(),
  name:      text("name"),
  role:      text("role").notNull().default("user"),
  createdAt: text("created_at").notNull().default(sql`now()`),
  lastSeen:  text("last_seen").notNull().default(sql`now()`),
});

// ─── Support ──────────────────────────────────────────────────────────────────

export const supportThreads = pgTable("support_threads", {
  id:        serial("id").primaryKey(),
  userId:    text("user_id").notNull(),
  status:    text("status").notNull().default("open"), // open | closed
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

export const supportMessages = pgTable("support_messages", {
  id:        serial("id").primaryKey(),
  threadId:  integer("thread_id").notNull().references(() => supportThreads.id, { onDelete: "cascade" }),
  senderId:  text("sender_id").notNull(),
  isAdmin:   boolean("is_admin").notNull().default(false),
  content:   text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// ─── Announcements ────────────────────────────────────────────────────────────

export const announcements = pgTable("announcements", {
  id:         serial("id").primaryKey(),
  content:    text("content").notNull(),
  targetRole: text("target_role").notNull().default("all"), // all|user|dev|admin
  active:     boolean("active").notNull().default(true),
  createdAt:  text("created_at").notNull().default(sql`now()`),
  createdBy:  text("created_by").notNull(),
});

// ─── Fitness Planning ─────────────────────────────────────────────────────────

export const workoutPlans = pgTable("workout_plans", {
  id:        serial("id").primaryKey(),
  userId:    text("user_id").notNull(),
  weekStart: text("week_start").notNull(), // Monday YYYY-MM-DD
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const plannedWorkouts = pgTable("planned_workouts", {
  id:        serial("id").primaryKey(),
  planId:    integer("plan_id").notNull().references(() => workoutPlans.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 1=Mon…7=Sun
  name:      text("name"),
});

export const plannedExercises = pgTable("planned_exercises", {
  id:               serial("id").primaryKey(),
  plannedWorkoutId: integer("planned_workout_id").notNull().references(() => plannedWorkouts.id, { onDelete: "cascade" }),
  exerciseId:       integer("exercise_id").notNull().references(() => exercises.id),
  targetSets:       integer("target_sets").notNull().default(3),
  targetReps:       integer("target_reps").notNull().default(12),
  sortOrder:        integer("sort_order").notNull().default(0),
});

// ─── Calendar Events ──────────────────────────────────────────────────────────

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(),   // YYYY-MM-DD
  time: text("time"),             // HH:MM (optional)
  color: text("color").notNull().default("#6366f1"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});
