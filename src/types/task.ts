export const TASK_STATUSES = [
  "Backlog",
  "Todo",
  "In Progress",
  "Done",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  assignee: string;
  status: TaskStatus;
  position: number;
  updatedAt: string;
};