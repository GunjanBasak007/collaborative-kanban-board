import type { Task } from "../types/task";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message || `Request failed: ${response.status}`
    );
  }

  return data as T;
}

export const api = {
  getBoard: () => request<Task[]>("/api/board"),

  createTask: (
    task: Omit<Task, "id" | "position" | "updatedAt">
  ) =>
    request<Task>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(task),
    }),

  updateTask: (
    id: string,
    updates: Partial<
      Pick<
        Task,
        "title" | "description" | "priority" |
        "assignee" | "status" | "position"
      >
    >
  ) =>
    request<Task>(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  deleteTask: (id: string) =>
    request<{ message: string; deletedTaskId: string }>(
      `/api/tasks/${id}`,
      { method: "DELETE" }
    ),
};