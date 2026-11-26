import type { Task } from "../types/task";
import { supabase } from "./supabase";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001";

// Extract the guest share token from /share/:token.
export const getBoardShareToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const match = window.location.pathname.match(
    /^\/share\/([A-Za-z0-9_-]{43})\/?$/
  );

  return match?.[1] ?? null;
};

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  const shareToken = getBoardShareToken();

  // GUEST ACCESS.
  if (shareToken) {
    headers.delete("Authorization");

    headers.set("X-Board-Share-Token", shareToken);
  } else {
    // OWNER ACCESS.
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(
        "Unable to retrieve authentication session"
      );
    }

    if (session?.access_token) {
      headers.set(
        "Authorization",
        `Bearer ${session.access_token}`
      );
    } else {
      headers.delete("Authorization");
    }
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
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
        | "title"
        | "description"
        | "priority"
        | "assignee"
        | "status"
        | "position"
      >
    >
  ) =>
    request<Task>(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  deleteTask: (id: string) =>
    request<{
      message: string;
      deletedTaskId: string;
    }>(`/api/tasks/${id}`, {
      method: "DELETE",
    }),
};