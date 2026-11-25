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
  return (
    <div className="board-filters">

      <div className="search-container">
        <input
          type="text"
          placeholder="Search tasks by title..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <select
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

      <select
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
  );
};

export default BoardFilters;