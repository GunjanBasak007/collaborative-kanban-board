import { useState } from "react";

import {
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "../../types/task";

type CreateTaskInput = Omit<
  Task,
  "id" | "position" | "updatedAt"
>;

type CreateTaskModalProps = {
  onClose: () => void;
  onCreate: (task: CreateTaskInput) => void;
};

const CreateTaskModal = ({
  onClose,
  onCreate,
}: CreateTaskModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] =
    useState<TaskPriority>("medium");
  const [assignee, setAssignee] = useState("");
  const [status, setStatus] = useState<TaskStatus>("Backlog");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim() || !assignee.trim()) return;

    onCreate({
      title: title.trim(),
      description: description.trim(),
      priority,
      assignee: assignee.trim(),
      status,
    });
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="task-modal">
        <div className="modal-header">
          <div>
            <h2>Create Task</h2>
            <p>Add a new task to your board.</p>
          </div>

          <button
            type="button"
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Task Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Priority</label>
            <select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as TaskPriority)
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="form-group">
            <label>Assignee</label>
            <input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Enter assignee name"
              required
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as TaskStatus)
              }
            >
              {TASK_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button type="submit" className="submit-button">
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;