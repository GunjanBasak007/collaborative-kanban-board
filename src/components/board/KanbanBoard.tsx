
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";

import "./board.css";

import { useBoard } from "../../hooks/useBoard";
import { useBoardFilters } from "../../hooks/useBoardFilters";
import { useCreateTask } from "../../hooks/useCreateTask";
import { useUpdateTask } from "../../hooks/useUpdateTask";
import { useDeleteTask } from "../../hooks/useDeleteTask";
import { useBoardEvents } from "../../hooks/useBoardEvents";

import {
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "../../types/task";

import KanbanColumn from "./KanbanColumn";
import BoardHeader from "./BoardHeader";
import BoardFilters from "../filters/BoardFilters";

import CreateTaskModal from "../tasks/CreateTaskModal";
import TaskDetailsModal from "../tasks/TaskDetailsModal";

type EditableTaskFields = Pick<
  Task,
  "title" | "description" | "priority" | "assignee" | "status"
>;

type GroupedTasks = Record<TaskStatus, Task[]>;

const groupTasks = (tasks: Task[]): GroupedTasks => {
  const grouped = {} as GroupedTasks;

  TASK_STATUSES.forEach((status) => {
    grouped[status] = tasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.position - b.position);
  });

  return grouped;
};

const flattenTasks = (grouped: GroupedTasks): Task[] => {
  return TASK_STATUSES.flatMap((status) =>
    (grouped[status] ?? []).map((task, index) => ({
      ...task,
      status,
      position: index,
    }))
  );
};

const KanbanBoard = () => {
  const queryClient = useQueryClient();

  const dragSnapshot = useRef<Task[]>([]);

  // Track active local interactions
  const isInteractingRef = useRef(false);

  // REAL-TIME SSE LISTENER
  const { flushPendingEvents } = useBoardEvents(isInteractingRef);

  // FETCH BOARD
  const {
    data: tasks = [],
    isLoading,
    isError,
    error,
  } = useBoard();

  // API MUTATIONS
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  // URL-SYNCHRONIZED FILTERS
  const {
    filters,
    setSearch,
    setPriority,
    setAssignee,
  } = useBoardFilters();

  // LOCAL UI STATE
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Default status for task creation
  const [createTaskStatus, setCreateTaskStatus] =
    useState<TaskStatus>("Backlog");

  // OPEN CREATE MODAL WITH SELECTED COLUMN STATUS
  const openCreateModal = (
    status: TaskStatus = "Backlog"
  ) => {
    isInteractingRef.current = true;
    setCreateTaskStatus(status);
    setIsCreateModalOpen(true);
  };

  // FILTER TASKS
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title
      .toLowerCase()
      .includes(filters.search.trim().toLowerCase());

    const matchesPriority =
      filters.priority === "all" ||
      task.priority === filters.priority;

    const matchesAssignee =
      filters.assignee === "all" ||
      task.assignee === filters.assignee;

    return matchesSearch && matchesPriority && matchesAssignee;
  });

  // GET UNIQUE ASSIGNEES
  const assignees = [
    ...new Set(tasks.map((task) => task.assignee)),
  ].sort((a, b) => a.localeCompare(b));

  // CHECK ACTIVE FILTERS
  const isFiltering =
    filters.search.trim() !== "" ||
    filters.priority !== "all" ||
    filters.assignee !== "all";

  // CREATE TASK
  const handleCreateTask = (
    input: Omit<Task, "id" | "position" | "updatedAt">
  ) => {
    createTaskMutation.mutate(input);

    isInteractingRef.current = false;
    setIsCreateModalOpen(false);

    void flushPendingEvents();
  };

  // UPDATE TASK
  const handleUpdateTask = (
    taskId: string,
    updates: EditableTaskFields
  ) => {
    updateTaskMutation.mutate({
      taskId,
      updates,
    });

    setSelectedTask(null);
    isInteractingRef.current = false;

    void flushPendingEvents();
  };

  // DELETE TASK
  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);

    setSelectedTask(null);
    isInteractingRef.current = false;

    void flushPendingEvents();
  };

  // CLOSE DETAILS MODAL
  const handleCloseDetails = () => {
    setSelectedTask(null);
    isInteractingRef.current = false;

    void flushPendingEvents();
  };

  // CLOSE CREATE MODAL
  const handleCloseCreate = () => {
    setIsCreateModalOpen(false);
    isInteractingRef.current = false;

    void flushPendingEvents();
  };

  // LOADING STATE
  if (isLoading) {
    return <div className="board-message">Loading board...</div>;
  }

  // ERROR STATE
  if (isError) {
    return (
      <div className="board-message error">
        {error.message || "Failed to load board"}
      </div>
    );
  }

  return (
    <DragDropProvider
      // DRAG START
      onDragStart={() => {
        if (isFiltering) return;

        isInteractingRef.current = true;

        const currentTasks =
          queryClient.getQueryData<Task[]>(["board"]) ?? [];

        dragSnapshot.current = currentTasks.map((task) => ({
          ...task,
        }));
      }}

      // DRAG OVER: IMMEDIATE UI UPDATE
      onDragOver={(event) => {
        if (isFiltering) return;

        const { source } = event.operation;

        if (!source || source.type !== "task") return;

        const currentTasks =
          queryClient.getQueryData<Task[]>(["board"]) ?? [];

        const groupedTasks = groupTasks(currentTasks);

        const movedTasks = move(
          groupedTasks,
          event
        ) as GroupedTasks;

        const updatedTasks = flattenTasks(movedTasks);

        queryClient.setQueryData<Task[]>(
          ["board"],
          updatedTasks
        );
      }}

      // DRAG END: PERSIST STATUS AND POSITION
      onDragEnd={async (event) => {
        if (isFiltering) {
          dragSnapshot.current = [];
          isInteractingRef.current = false;
          void flushPendingEvents();
          return;
        }

        const { source, target } = event.operation;

        if (event.canceled || !source || !target) {
          queryClient.setQueryData<Task[]>(
            ["board"],
            dragSnapshot.current
          );

          dragSnapshot.current = [];
          isInteractingRef.current = false;

          void flushPendingEvents();
          return;
        }

        const taskId = String(source.id);

        const currentTasks =
          queryClient.getQueryData<Task[]>(["board"]) ?? [];

        const movedTask = currentTasks.find(
          (task) => task.id === taskId
        );

        const originalTask = dragSnapshot.current.find(
          (task) => task.id === taskId
        );

        if (!movedTask || !originalTask) {
          dragSnapshot.current = [];
          isInteractingRef.current = false;

          void flushPendingEvents();
          return;
        }

        // No actual movement
        if (
          movedTask.status === originalTask.status &&
          movedTask.position === originalTask.position
        ) {
          dragSnapshot.current = [];
          isInteractingRef.current = false;

          void flushPendingEvents();
          return;
        }

        try {
          // Persist final position through PATCH
          await updateTaskMutation.mutateAsync({
            taskId,
            updates: {
              status: movedTask.status,
              position: movedTask.position,
            },
          });
        } catch (error) {
          console.error("Failed to persist task movement:", error);

          // Restore original board and reconcile with database
          queryClient.setQueryData<Task[]>(
            ["board"],
            dragSnapshot.current
          );

          await queryClient.invalidateQueries({
            queryKey: ["board"],
          });
        } finally {
          dragSnapshot.current = [];
          isInteractingRef.current = false;

          void flushPendingEvents();
        }
      }}
    >
      <main className="board-page">
        <div className="board-container">

          {/* BOARD HEADER */}
          <BoardHeader
            totalTasks={tasks.length}
            onCreateClick={() => openCreateModal("Backlog")}
          />

          {/* SEARCH AND FILTERS */}
          <BoardFilters
            search={filters.search}
            priority={filters.priority}
            assignee={filters.assignee}
            assignees={assignees}
            onSearchChange={setSearch}
            onPriorityChange={setPriority}
            onAssigneeChange={setAssignee}
          />

          {isFiltering && (
            <p className="filter-hint">
              Clear filters to enable drag-and-drop reordering.
            </p>
          )}

          {/* MUTATION ERROR MESSAGES */}
          {createTaskMutation.isError && (
            <p className="api-error" role="alert">
              Create failed: {createTaskMutation.error.message}
            </p>
          )}

          {updateTaskMutation.isError && (
            <p className="api-error" role="alert">
              Update failed: {updateTaskMutation.error.message}
            </p>
          )}

          {deleteTaskMutation.isError && (
            <p className="api-error" role="alert">
              Delete failed: {deleteTaskMutation.error.message}
            </p>
          )}

          {/* KANBAN COLUMNS */}
          <div className="kanban-board">
            {TASK_STATUSES.map((status) => {
              const columnTasks = filteredTasks.filter(
                (task) => task.status === status
              );

              return (
                <KanbanColumn
                  key={status}
                  status={status}
                  tasks={columnTasks}
                  onTaskClick={(task) => {
                    isInteractingRef.current = true;
                    setSelectedTask(task);
                  }}
                  onAddTask={() => openCreateModal(status)}
                  isFiltering={isFiltering}
                />
              );
            })}
          </div>

          {/* CREATE TASK MODAL */}
          {isCreateModalOpen && (
            <CreateTaskModal
              onClose={handleCloseCreate}
              onCreate={handleCreateTask}
              initialStatus={createTaskStatus}
            />
          )}

          {/* TASK DETAILS MODAL */}
          {selectedTask && (
            <TaskDetailsModal
              task={selectedTask}
              onClose={handleCloseDetails}
              onUpdate={handleUpdateTask}
              onDelete={handleDeleteTask}
            />
          )}

        </div>
      </main>
    </DragDropProvider>
  );
};

export default KanbanBoard;
