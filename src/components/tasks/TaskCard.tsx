
import { useSortable } from "@dnd-kit/react/sortable";
import { MoreHorizontal } from "lucide-react";

import type { Task } from "../../types/task";

type TaskCardProps = {
  task: Task;
  index: number;
  onClick: (task: Task) => void;
  isFiltering: boolean;
};

const TaskCard = ({
  task,
  index,
  onClick,
  isFiltering,
}: TaskCardProps) => {
  const { ref, isDragging } = useSortable({
    id: task.id,
    index,
    group: task.status,
    type: "task",
    accept: "task",
    disabled: isFiltering,
  });

  const priorityLabel =
    task.priority.charAt(0).toUpperCase() +
    task.priority.slice(1);

  const assigneeInitial =
    task.assignee.trim().charAt(0).toUpperCase();

  return (
    <button
      ref={ref}
      type="button"
      aria-label={`Open task: ${task.title}`}
      className={`task-card ${isDragging ? "is-dragging" : ""}`}
      onClick={() => onClick(task)}
    >
      {/* CARD HEADER */}
      <div className="task-card-top">
        <span
          className={`priority-badge priority-${task.priority}`}
        >
          <span className="priority-dot" />
          {priorityLabel}
        </span>

        <span
          className="task-card-menu-icon"
          aria-hidden="true"
        >
          <MoreHorizontal size={19} />
        </span>
      </div>

      {/* TASK CONTENT */}
      <div className="task-card-content">
        <h3 className="task-title">{task.title}</h3>

        {task.description && (
          <p className="task-description">
            {task.description}
          </p>
        )}
      </div>

      {/* CARD FOOTER */}
      <div className="task-card-footer">
        <span className="assignee-avatar">
          {assigneeInitial || "?"}
        </span>

        <span className="assignee-name">
          {task.assignee}
        </span>
      </div>
    </button>
  );
};

export default TaskCard;
