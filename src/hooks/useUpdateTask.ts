
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";
import type { Task, TaskStatus } from "../types/task";

type UpdateTaskVariables = {
  taskId: string;
  updates: Partial<
    Pick<
      Task,
      "title" |
      "description" |
      "priority" |
      "assignee" |
      "status" |
      "position"
    >
  >;
};

type MutationContext = {
  previousTask?: Task;
  optimisticTask?: Task;
  changedFields: string[];
  orderChanged: boolean;
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Task,
    Error,
    UpdateTaskVariables,
    MutationContext
  >({
    // Identifies this as a board-related mutation
    mutationKey: ["board"],

    // Actual PATCH request
    mutationFn: ({ taskId, updates }) =>
      api.updateTask(taskId, updates),

    // OPTIMISTIC UPDATE
    onMutate: async ({ taskId, updates }) => {
      await queryClient.cancelQueries({
        queryKey: ["board"],
      });

      const currentTasks =
        queryClient.getQueryData<Task[]>(["board"]) ?? [];

      const existingTask = currentTasks.find(
        (task) => task.id === taskId
      );

      if (!existingTask) {
        return {
          changedFields: [],
          orderChanged: false,
        };
      }

      const destinationStatus =
        updates.status ?? existingTask.status;

      const statusChanged =
        destinationStatus !== existingTask.status;

      const orderChanged =
        statusChanged || updates.position !== undefined;

      const withoutTask = currentTasks.filter(
        (task) => task.id !== taskId
      );

      const destinationTasks = withoutTask
        .filter((task) => task.status === destinationStatus)
        .sort((a, b) => a.position - b.position);

      const requestedPosition =
        updates.position ??
        (statusChanged
          ? destinationTasks.length
          : existingTask.position);

      const targetPosition = Math.min(
        Math.max(0, requestedPosition),
        destinationTasks.length
      );

      const optimisticTask: Task = {
        ...existingTask,
        ...updates,
        status: destinationStatus,
        position: targetPosition,
        updatedAt: new Date().toISOString(),
      };

      // Insert task into its optimistic destination.
      destinationTasks.splice(
        targetPosition,
        0,
        optimisticTask
      );

      const affectedStatuses = new Set<TaskStatus>([
        existingTask.status,
        destinationStatus,
      ]);

      const updatedTasks = withoutTask.filter(
        (task) => !affectedStatuses.has(task.status)
      );

      // Normalize positions in affected columns.
      for (const status of affectedStatuses) {
        const columnTasks =
          status === destinationStatus
            ? destinationTasks
            : withoutTask
                .filter((task) => task.status === status)
                .sort((a, b) => a.position - b.position);

        columnTasks.forEach((task, index) => {
          updatedTasks.push({
            ...task,
            position: index,
          });
        });
      }

      queryClient.setQueryData<Task[]>(
        ["board"],
        updatedTasks
      );

      return {
        previousTask: existingTask,
        optimisticTask,
        changedFields: Object.keys(updates),
        orderChanged,
      };
    },

    // OPERATION-AWARE ROLLBACK
    onError: (_error, _variables, context) => {
      if (!context?.previousTask || !context.optimisticTask) {
        return;
      }

      const {
        previousTask,
        optimisticTask,
        changedFields,
        orderChanged,
      } = context;

      queryClient.setQueryData<Task[]>(
        ["board"],
        (currentTasks = []) => {
          const currentTask = currentTasks.find(
            (task) => task.id === optimisticTask.id
          );

          // Do not resurrect a task deleted remotely.
          if (!currentTask) {
            return currentTasks;
          }

          const restoredTask = { ...currentTask };

          // Roll back only fields that have not been changed
          // by another operation since our optimistic update.
          const scalarFields = [
            "title",
            "description",
            "priority",
            "assignee",
          ] as const;

         for (const field of scalarFields) {
  if (
    changedFields.includes(field) &&
    currentTask[field] === optimisticTask[field]
  ) {
    switch (field) {
      case "title":
        restoredTask.title = previousTask.title;
        break;

      case "description":
        restoredTask.description = previousTask.description;
        break;

      case "priority":
        restoredTask.priority = previousTask.priority;
        break;

      case "assignee":
        restoredTask.assignee = previousTask.assignee;
        break;
    }
  }
}

          let result = currentTasks;

          // Reverse the move/reorder only when the task
          // still occupies the optimistic location.
          const canRollbackOrder =
            orderChanged &&
            currentTask.status === optimisticTask.status &&
            currentTask.position === optimisticTask.position;

          if (canRollbackOrder) {
            const remainingTasks = currentTasks.filter(
              (task) => task.id !== currentTask.id
            );

            const originalColumn = remainingTasks
              .filter(
                (task) => task.status === previousTask.status
              )
              .sort((a, b) => a.position - b.position);

            const restorePosition = Math.min(
              previousTask.position,
              originalColumn.length
            );

            restoredTask.status = previousTask.status;

            originalColumn.splice(
              restorePosition,
              0,
              restoredTask
            );

            const affectedStatuses = new Set<TaskStatus>([
              previousTask.status,
              optimisticTask.status,
            ]);

            result = remainingTasks.filter(
              (task) => !affectedStatuses.has(task.status)
            );

            for (const status of affectedStatuses) {
              const columnTasks =
                status === previousTask.status
                  ? originalColumn
                  : remainingTasks
                      .filter((task) => task.status === status)
                      .sort((a, b) => a.position - b.position);

              columnTasks.forEach((task, index) => {
                result.push({
                  ...task,
                  position: index,
                });
              });
            }
          } else {
            // Preserve newer ordering if another operation
            // has already moved the task.
            if (
              currentTask.updatedAt === optimisticTask.updatedAt
            ) {
              restoredTask.updatedAt = previousTask.updatedAt;
            }

            result = currentTasks.map((task) =>
              task.id === currentTask.id
                ? restoredTask
                : task
            );
          }

          return result;
        }
      );
    },

    // REFRESH AUTHORITATIVE DATABASE STATE
    onSettled: () => {
      return queryClient.invalidateQueries({
        queryKey: ["board"],
      });
    },
  });
};
