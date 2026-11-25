
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";
import type { Task } from "../types/task";

type MutationContext = {
  deletedTask?: Task;
  originalPosition?: number;
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; deletedTaskId: string },
    Error,
    string,
    MutationContext
  >({
    // Identifies this as a board-related mutation
    mutationKey: ["board"],

    mutationFn: api.deleteTask,

    // OPTIMISTIC DELETE
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({
        queryKey: ["board"],
      });

      const currentTasks =
        queryClient.getQueryData<Task[]>(["board"]) ?? [];

      const deletedTask = currentTasks.find(
        (task) => task.id === taskId
      );

      if (!deletedTask) {
        return {};
      }

      const remainingTasks = currentTasks.filter(
        (task) => task.id !== taskId
      );

      // Recalculate positions only in the affected column
      const columnTasks = remainingTasks
        .filter((task) => task.status === deletedTask.status)
        .sort((a, b) => a.position - b.position);

      const normalizedTasks = remainingTasks.map((task) => {
        if (task.status !== deletedTask.status) {
          return task;
        }

        const newPosition = columnTasks.findIndex(
          (item) => item.id === task.id
        );

        return {
          ...task,
          position: newPosition,
        };
      });

      queryClient.setQueryData<Task[]>(
        ["board"],
        normalizedTasks
      );

      return {
        deletedTask,
        originalPosition: deletedTask.position,
      };
    },

    // ROLLBACK ON FAILURE
    onError: (_error, taskId, context) => {
      if (!context?.deletedTask) return;

      queryClient.setQueryData<Task[]>(
        ["board"],
        (currentTasks = []) => {
          // Avoid restoring duplicates
          if (currentTasks.some((task) => task.id === taskId)) {
            return currentTasks;
          }

          const restoredColumn = currentTasks
            .filter(
              (task) => task.status === context.deletedTask!.status
            )
            .sort((a, b) => a.position - b.position);

          // Restore the deleted task at its previous position
          const restorePosition = Math.min(
            context.originalPosition ?? restoredColumn.length,
            restoredColumn.length
          );

          restoredColumn.splice(
            restorePosition,
            0,
            context.deletedTask!
          );

          // Normalize positions after restoration
          const normalizedColumn = restoredColumn.map(
            (task, index) => ({
              ...task,
              position: index,
            })
          );

          const otherColumns = currentTasks.filter(
            (task) =>
              task.status !== context.deletedTask!.status
          );

          return [...otherColumns, ...normalizedColumn];
        }
      );
    },

    // REFRESH FROM DATABASE
    onSettled: () => {
      return queryClient.invalidateQueries({
        queryKey: ["board"],
      });
    },
  });
};
