
import { useDroppable } from "@dnd-kit/react";

import type { Task, TaskStatus } from "../../types/task";
import TaskCard from "../tasks/TaskCard";

type KanbanColumnProps = {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  isFiltering: boolean;
};

const KanbanColumn = ({
  status,
  tasks,
  onTaskClick,
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

  return (
    <section
      ref={ref}
      className={`kanban-column ${
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
        ) : (
          <div className="empty-column">
            {isFiltering
              ? "No matching tasks"
              : "Drop a task here"}
          </div>
        )}
      </div>
    </section>
  );
};

export default KanbanColumn;
