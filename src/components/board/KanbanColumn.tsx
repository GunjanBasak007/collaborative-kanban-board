import { useDroppable } from "@dnd-kit/react";
import {
  ClipboardList,
  CircleCheck,
  Rocket,
  PartyPopper,
  Plus,
} from "lucide-react";

import type { Task, TaskStatus } from "../../types/task";
import TaskCard from "../tasks/TaskCard";

type KanbanColumnProps = {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: () => void;
  isFiltering: boolean;
};

const KanbanColumn = ({
  status,
  tasks,
  onTaskClick,
  onAddTask,
  isFiltering,
}: KanbanColumnProps) => {
  const { ref, isDropTarget } = useDroppable({
    id: status,
    accept: "task",
    collisionPriority: -1,
  });

  const sortedTasks = [...tasks].sort(
    (a, b) => a.position - b.position
  );

  const columnTheme = status
    .toLowerCase()
    .replace(/\s+/g, "-");

  const EmptyIcon =
    status === "Backlog"
      ? ClipboardList
      : status === "Todo"
        ? CircleCheck
        : status === "In Progress"
          ? Rocket
          : PartyPopper;

  const emptyTitle =
    status === "Backlog"
      ? "Nothing here yet"
      : status === "Todo"
        ? "No tasks to do"
        : status === "In Progress"
          ? "Nothing in progress"
          : "No completed tasks yet";

  const emptyDescription =
    status === "Backlog"
      ? "Capture your ideas and tasks here."
      : status === "Todo"
        ? "Add a task or move one here when it's ready."
        : status === "In Progress"
          ? "Start working on a task to see it here."
          : "Your completed work will appear here.";

  return (
    <section
      ref={ref}
      className={`kanban-column column-${columnTheme} ${
        isDropTarget ? "is-drop-target" : ""
      }`}
    >
      <div className="column-header">
        <h2>{status}</h2>

        <span className="task-count">
          {tasks.length}
        </span>
      </div>

      <div className="task-list">
        {sortedTasks.length > 0 ? (
          sortedTasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              onClick={onTaskClick}
              isFiltering={isFiltering}
            />
          ))
        ) : isFiltering ? (
          <div className="empty-filter-state">
            No matching tasks
          </div>
        ) : (
          <div className="empty-column">
            <div className="empty-column-icon">
              <EmptyIcon size={30} strokeWidth={1.8} />
            </div>

            <h3>{emptyTitle}</h3>

            <p>{emptyDescription}</p>

            <button
              type="button"
              className="empty-add-button"
              onClick={onAddTask}
            >
              <Plus size={17} />
              Add Task
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default KanbanColumn;