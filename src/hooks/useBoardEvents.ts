
import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { API_BASE_URL } from "../lib/api";

type InteractionRef = {
  current: boolean;
};

type BoardEvent = {
  type: "TASK_CREATED" | "TASK_UPDATED" | "TASK_DELETED";
  task?: {
    id: string;
  };
  taskId?: string;
};

export const useBoardEvents = (
  isInteractingRef: InteractionRef
) => {
  const queryClient = useQueryClient();

  const pendingRefreshRef = useRef(false);

  // Process deferred events when it is safe to refresh the board.
  const flushPendingEvents = useCallback(async () => {
    if (isInteractingRef.current) return;

    if (
      queryClient.isMutating({
        mutationKey: ["board"],
      }) > 0
    ) {
      return;
    }

    if (!pendingRefreshRef.current) return;

    pendingRefreshRef.current = false;

    await queryClient.invalidateQueries({
      queryKey: ["board"],
    });
  }, [queryClient, isInteractingRef]);

  // Listen for database changes through SSE.
  useEffect(() => {
    const eventSource = new EventSource(
      `${API_BASE_URL}/api/events`
    );

    console.log("Connecting to board SSE stream...");

    eventSource.onopen = () => {
      console.log("Board SSE connection established");
    };

    eventSource.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as BoardEvent;

        const supportedEvents = [
          "TASK_CREATED",
          "TASK_UPDATED",
          "TASK_DELETED",
        ];

        if (!supportedEvents.includes(event.type)) return;

        console.log("Received board event:", event);

        // Don't refresh during a local interaction or mutation.
        if (
          isInteractingRef.current ||
          queryClient.isMutating({
            mutationKey: ["board"],
          }) > 0
        ) {
          pendingRefreshRef.current = true;

          console.log("Board refresh deferred");

          return;
        }

        // Fetch the authoritative board, including updated positions.
        void queryClient.invalidateQueries({
          queryKey: ["board"],
        });
      } catch (error) {
        console.error("Failed to process SSE event:", error);
      }
    };

    eventSource.onerror = () => {
      console.warn(
        "SSE connection interrupted. Browser will attempt to reconnect."
      );
    };

    return () => {
      console.log("Closing board SSE connection");
      eventSource.close();
    };
  }, [queryClient, isInteractingRef]);

  // Watch for mutations finishing.
  // If an SSE refresh was deferred, process it now.
  useEffect(() => {
    const unsubscribe = queryClient
      .getMutationCache()
      .subscribe(() => {
        void flushPendingEvents();
      });

    return unsubscribe;
  }, [queryClient, flushPendingEvents]);

  return {
    flushPendingEvents,
  };
};
