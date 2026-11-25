import { useEffect, useState } from "react";
import type { TaskPriority } from "../types/task";

export type PriorityFilter = "all" | TaskPriority;

export type BoardFiltersState = {
  search: string;
  priority: PriorityFilter;
  assignee: string;
};

const isTaskPriority = (
  value: string | null
): value is TaskPriority => {
  return (
    value === "low" ||
    value === "medium" ||
    value === "high"
  );
};

// Read filters from URL
const getFiltersFromURL = (): BoardFiltersState => {
  const params = new URLSearchParams(window.location.search);

  const priorityParam = params.get("priority");

  return {
    search: params.get("search") ?? "",
    priority: isTaskPriority(priorityParam)
      ? priorityParam
      : "all",
    assignee: params.get("assignee") ?? "all",
  };
};

export const useBoardFilters = () => {
  const [filters, setFilters] = useState<BoardFiltersState>(
    getFiltersFromURL
  );

  // Update URL whenever filters change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (filters.search.trim()) {
      params.set("search", filters.search);
    } else {
      params.delete("search");
    }

    if (filters.priority !== "all") {
      params.set("priority", filters.priority);
    } else {
      params.delete("priority");
    }

    if (filters.assignee !== "all") {
      params.set("assignee", filters.assignee);
    } else {
      params.delete("assignee");
    }

    const queryString = params.toString();

    const newURL =
      window.location.pathname +
      (queryString ? `?${queryString}` : "") +
      window.location.hash;

    window.history.replaceState(
      window.history.state,
      "",
      newURL
    );
  }, [filters]);

  // Restore filters when browser navigation changes the URL
  useEffect(() => {
    const handlePopState = () => {
      setFilters(getFiltersFromURL());
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return {
    filters,

    setSearch: (search: string) =>
      setFilters((previous) => ({
        ...previous,
        search,
      })),

    setPriority: (priority: PriorityFilter) =>
      setFilters((previous) => ({
        ...previous,
        priority,
      })),

    setAssignee: (assignee: string) =>
      setFilters((previous) => ({
        ...previous,
        assignee,
      })),
  };
};