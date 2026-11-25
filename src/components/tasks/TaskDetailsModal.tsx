
import { useState, type FormEvent } from "react";
import { Trash2, AlertTriangle } from "lucide-react";

import {
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "../../types/task";

type TaskDetailsModalProps = {
  task: Task;
  onClose: () => void;
  onUpdate: (
    taskId: string,
    updates: Pick<
      Task,
      "title" | "description" | "priority" | "assignee" | "status"
    >
  ) => void;
  onDelete: (taskId: string) => void;
};

const TaskDetailsModal = ({
  task,
  onClose,
  onUpdate,
  onDelete,
}: TaskDetailsModalProps) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assignee, setAssignee] = useState(task.assignee);
  const [status, setStatus] = useState<TaskStatus>(task.status);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim() || !assignee.trim()) return;

    onUpdate(task.id, {
      title: title.trim(),
      description: description.trim(),
      priority,
      assignee: assignee.trim(),
      status,
    });
  };

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    setIsDeleteConfirmOpen(false);
    onDelete(task.id);
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="task-modal">
        <div className="modal-header">
          <div>
            <h2>Task Details</h2>
            <p>View and update your task information.</p>
          </div>

          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Close modal"
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
              rows={4}
              placeholder="Describe the task"
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
              placeholder="Enter assignee"
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

          <div className="modal-actions modal-actions-between">
            <button
              type="button"
              className="delete-button"
              onClick={handleDelete}
            >
              <Trash2 size={15} />
              Delete Task
            </button>

            <div className="modal-actions-right">
              <button
                type="button"
                className="cancel-button"
                onClick={onClose}
              >
                Cancel
              </button>

              <button type="submit" className="submit-button">
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* CUSTOM DELETE CONFIRMATION */}
      {isDeleteConfirmOpen && (
        <div
          className="delete-confirm-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setIsDeleteConfirmOpen(false);
            }
          }}
        >
          <div
            className="delete-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            aria-describedby="delete-confirm-description"
          >
            <div className="delete-confirm-icon">
              <AlertTriangle size={23} />
            </div>

            <h3 id="delete-confirm-title">
              Delete this task?
            </h3>

            <p id="delete-confirm-description">
              Are you sure you want to delete{" "}
              <strong>"{task.title}"</strong>?
              This action cannot be undone.
            </p>

            <div className="delete-confirm-actions">
              <button
                type="button"
                className="delete-confirm-cancel"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-action"
                onClick={handleConfirmDelete}
                autoFocus
              >
                <Trash2 size={15} />
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetailsModal;
