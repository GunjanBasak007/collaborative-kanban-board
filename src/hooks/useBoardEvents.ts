import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  API_BASE_URL,
  getBoardShareToken,
} from "../lib/api";

import { supabase } from "../lib/supabase";

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

  useEffect(() => {
    const controller = new AbortController();

    let stopped = false;

    let reconnectTimer:
      | ReturnType<typeof setTimeout>
      | undefined;

    let reconnectDelay = 1000;

    const processEvent = (frame: string) => {
      const data = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");

      if (!data) return;

      try {
        const event = JSON.parse(data) as BoardEvent;

        const supportedEvents = [
          "TASK_CREATED",
          "TASK_UPDATED",
          "TASK_DELETED",
        ];

        if (!supportedEvents.includes(event.type)) return;

        console.log("Received board event:", event);

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

        void queryClient.invalidateQueries({
          queryKey: ["board"],
        });
      } catch (error) {
        console.error("Failed to process SSE event:", error);
      }
    };

    const scheduleReconnect = () => {
      if (stopped || controller.signal.aborted) return;

      reconnectTimer = setTimeout(() => {
        void connect();
      }, reconnectDelay);

      reconnectDelay = Math.min(
        reconnectDelay * 2,
        15000
      );
    };

    const connect = async () => {
      try {
        const headers = new Headers({
          Accept: "text/event-stream",
        });

        // GUEST SSE CONNECTION.
        const shareToken = getBoardShareToken();

        if (shareToken) {
          headers.set(
            "X-Board-Share-Token",
            shareToken
          );
        } else {
          // OWNER SSE CONNECTION.
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            throw sessionError;
          }

          if (!session?.access_token) {
            console.warn(
              "No Supabase session available for SSE"
            );

            scheduleReconnect();
            return;
          }

          headers.set(
            "Authorization",
            `Bearer ${session.access_token}`
          );
        }

        console.log(
          shareToken
            ? "Connecting to guest board SSE stream..."
            : "Connecting to authenticated board SSE stream..."
        );

        const response = await fetch(
          `${API_BASE_URL}/api/events`,
          {
            method: "GET",
            headers,
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `SSE request failed: ${response.status}`
          );
        }

        if (!response.body) {
          throw new Error(
            "SSE response body is unavailable"
          );
        }

        console.log("Board SSE connection established");

        reconnectDelay = 1000;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";

        while (!stopped) {
          const { value, done } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, {
            stream: true,
          });

          // Process complete SSE frames.
          let boundary = buffer.indexOf("\n\n");

          while (boundary !== -1) {
            const frame = buffer.slice(0, boundary);

            buffer = buffer.slice(boundary + 2);

            processEvent(frame);

            boundary = buffer.indexOf("\n\n");
          }
        }

        await reader.cancel().catch(() => {});
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.warn(
          "SSE connection interrupted:",
          error
        );
      }

      scheduleReconnect();
    };

    void connect();

    return () => {
      stopped = true;
      controller.abort();

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      console.log("Closing board SSE connection");
    };
  }, [queryClient, isInteractingRef]);

  // Process queued refreshes after mutations finish.
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