
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";
import type { Task } from "../types/task";

type CreateTaskInput = Omit<
  Task,
  "id" | "position" | "updatedAt"
>;

type MutationContext = {
  optimisticTaskId: string;
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Task,
    Error,
    CreateTaskInput,
    MutationContext
  >({
    // Identifies this as a board-related mutation
    mutationKey: ["board"],

    // Actual API request
    mutationFn: api.createTask,

    // OPTIMISTIC UPDATE
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: ["board"],
      });

      const previousTasks =
        queryClient.getQueryData<Task[]>(["board"]) ?? [];

      const columnTasks = previousTasks.filter(
        (task) => task.status === input.status
      );

      const nextPosition =
        columnTasks.length === 0
          ? 0
          : Math.max(
              ...columnTasks.map((task) => task.position)
            ) + 1;

      const optimisticTaskId = `temp-${crypto.randomUUID()}`;

      const optimisticTask: Task = {
        ...input,
        id: optimisticTaskId,
        position: nextPosition,
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Task[]>(["board"], [
        ...previousTasks,
        optimisticTask,
      ]);

      return {
        optimisticTaskId,
      };
    },

    // ROLLBACK ON FAILURE
    onError: (_error, _input, context) => {
      if (!context) return;

      queryClient.setQueryData<Task[]>(
        ["board"],
        (currentTasks = []) =>
          currentTasks.filter(
            (task) => task.id !== context.optimisticTaskId
          )
      );
    },

    // REPLACE TEMPORARY TASK WITH DATABASE RECORD
    onSuccess: (createdTask, _input, context) => {
      queryClient.setQueryData<Task[]>(
        ["board"],
        (currentTasks = []) => {
          const optimisticExists = currentTasks.some(
            (task) => task.id === context.optimisticTaskId
          );

          if (optimisticExists) {
            return currentTasks.map((task) =>
              task.id === context.optimisticTaskId
                ? createdTask
                : task
            );
          }

          // Avoid duplicates if an event/refetch already added it.
          if (
            currentTasks.some(
              (task) => task.id === createdTask.id
            )
          ) {
            return currentTasks;
          }

          return [...currentTasks, createdTask];
        }
      );
    },

    // REFRESH FROM DATABASE
 onSettled: (_data, error) => {
  // No refetch needed after rollback.
  if (error) return;

  return queryClient.invalidateQueries({
    queryKey: ["board"],
  });
},
  });
};
