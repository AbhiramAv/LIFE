export type IssueStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done" | "cancelled";
export type IssuePriority = "urgent" | "high" | "medium" | "low" | "none";
export type ProjectCategory = "project" | "certification" | "career" | "personal";
export type ProjectStatus = "active" | "paused" | "completed" | "archived";

export type Project = {
  id: number;
  title: string;
  description: string | null;
  category: ProjectCategory;
  color: string;
  status: ProjectStatus;
  targetDate: string | null;
  createdAt: string;
  totalIssues: number;
  doneIssues: number;
};

export type Issue = {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  label: string | null;
  dueDate: string | null;
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const STATUS_CONFIG: Record<IssueStatus, { label: string; color: string; next: IssueStatus }> = {
  backlog:     { label: "Backlog",     color: "#6b7280", next: "todo"        },
  todo:        { label: "Todo",        color: "#94a3b8", next: "in_progress" },
  in_progress: { label: "In Progress", color: "#f59e0b", next: "in_review"   },
  in_review:   { label: "In Review",   color: "#3b82f6", next: "done"        },
  done:        { label: "Done",        color: "#10b981", next: "cancelled"   },
  cancelled:   { label: "Cancelled",   color: "#ef4444", next: "backlog"     },
};

export const PRIORITY_CONFIG: Record<IssuePriority, { label: string; color: string; icon: string }> = {
  urgent: { label: "Urgent", color: "#ef4444", icon: "●" },
  high:   { label: "High",   color: "#f97316", icon: "●" },
  medium: { label: "Medium", color: "#eab308", icon: "●" },
  low:    { label: "Low",    color: "#3b82f6", icon: "●" },
  none:   { label: "None",   color: "#6b7280", icon: "○" },
};

export const CATEGORY_CONFIG: Record<ProjectCategory, { label: string; color: string }> = {
  project:     { label: "Project",     color: "#8b5cf6" },
  certification: { label: "Certification", color: "#f59e0b" },
  career:      { label: "Career",      color: "#10b981" },
  personal:    { label: "Personal",    color: "#f43f5e" },
};

export const STATUS_ORDER: IssueStatus[] = ["todo", "in_progress", "in_review", "backlog", "done", "cancelled"];

export const PROJECT_COLORS = [
  "#8b5cf6", "#f43f5e", "#10b981", "#f59e0b",
  "#3b82f6", "#ec4899", "#06b6d4", "#84cc16",
];
