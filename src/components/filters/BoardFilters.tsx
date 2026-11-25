import {
  Search,
  Users,
  X,
  Filter,
} from "lucide-react";

import type { PriorityFilter } from "../../hooks/useBoardFilters";

type BoardFiltersProps = {
  search: string;
  priority: PriorityFilter;
  assignee: string;
  assignees: string[];

  onSearchChange: (value: string) => void;
  onPriorityChange: (value: PriorityFilter) => void;
  onAssigneeChange: (value: string) => void;
};

const BoardFilters = ({
  search,
  priority,
  assignee,
  assignees,
  onSearchChange,
  onPriorityChange,
  onAssigneeChange,
}: BoardFiltersProps) => {
  const hasActiveFilters =
    search.trim() !== "" ||
    priority !== "all" ||
    assignee !== "all";

  const handleClearFilters = () => {
    onSearchChange("");
    onPriorityChange("all");
    onAssigneeChange("all");
  };

  return (
    <div className="board-filters">
      {/* SEARCH */}
      <div className="search-container">
        <Search size={19} className="filter-icon" />

        <input
          type="text"
          aria-label="Search tasks"
          placeholder="Search tasks by title..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />

        {search && (
          <button
            type="button"
            className="search-clear-button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* PRIORITY FILTER */}
      <div className="filter-select-container">
        <Filter size={17} className="filter-icon" />

        <select
          aria-label="Filter by priority"
          value={priority}
          onChange={(e) =>
            onPriorityChange(e.target.value as PriorityFilter)
          }
        >
          <option value="all">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
      </div>

      {/* ASSIGNEE FILTER */}
      <div className="filter-select-container">
        <Users size={18} className="filter-icon" />

        <select
          aria-label="Filter by assignee"
          value={assignee}
          onChange={(e) => onAssigneeChange(e.target.value)}
        >
          <option value="all">All Assignees</option>

          {assignees.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* CLEAR FILTERS */}
      <button
        type="button"
        className="clear-filters-button"
        onClick={handleClearFilters}
        disabled={!hasActiveFilters}
      >
        <X size={16} />
        Clear
      </button>
    </div>
  );
};

export default BoardFilters;
