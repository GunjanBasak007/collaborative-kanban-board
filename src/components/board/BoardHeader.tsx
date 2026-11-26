type BoardHeaderProps = {
  totalTasks: number;
  onCreateClick: () => void;
  onShareClick?: () => void;
};

const BoardHeader = ({
  totalTasks,
  onCreateClick,
  onShareClick,
}: BoardHeaderProps) => {
  return (
    <header className="board-header">
      <div>
        <span className="board-eyebrow">
          PROJECT MANAGEMENT
        </span>

        <h1>My Kanban Board</h1>

        <p>
          Organize your work, collaborate in real time,
          and track your progress.
        </p>
      </div>

      <div className="header-actions">
        <div className="board-total">
          {totalTasks} tasks
        </div>

        {onShareClick && (
          <button
            type="button"
            className="create-task-button share-board-button"
            onClick={onShareClick}
          >
            Share Board
          </button>
        )}

        <button
          type="button"
          className="create-task-button"
          onClick={onCreateClick}
        >
          + Create Task
        </button>
      </div>
    </header>
  );
};

export default BoardHeader;