
import type { Task } from "../../types/task";
import { useSortable } from "@dnd-kit/react/sortable";

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

  return (
    <button
      ref={ref}
      type="button"
      className={`task-card ${isDragging ? "is-dragging" : ""}`}
      onClick={() => onClick(task)}
    >
      <div className="task-card-top">
        <span className={`priority-badge priority-${task.priority}`}>
          {task.priority}
        </span>
      </div>

      <h3 className="task-title">{task.title}</h3>

      <p className="task-description">{task.description}</p>

      <div className="task-card-footer">
        <span className="assignee-avatar">
          {task.assignee.charAt(0).toUpperCase()}
        </span>

        <span className="assignee-name">{task.assignee}</span>
      </div>
    </button>
  );
};

export default TaskCard;
