
// Board-specific SSE connections.
//
// Map structure:
// {
//   boardId: Set<Response>,
//   boardId: Set<Response>
// }

const clientsByBoard = new Map();

// Register a client for a specific board.
export const addClient = (res, boardId) => {
  if (!boardId) {
    throw new Error("Board ID is required for SSE registration");
  }

  if (!clientsByBoard.has(boardId)) {
    clientsByBoard.set(boardId, new Set());
  }

  const clients = clientsByBoard.get(boardId);

  clients.add(res);

  console.log(
    `SSE client connected to board ${boardId}. Clients: ${clients.size}`
  );

  // Return cleanup function.
  return () => {
    const boardClients = clientsByBoard.get(boardId);

    if (!boardClients) return;

    boardClients.delete(res);

    if (boardClients.size === 0) {
      clientsByBoard.delete(boardId);
    }

    console.log(
      `SSE client disconnected from board ${boardId}.`
    );
  };
};

// Broadcast an event only to clients connected to the specified board.
export const broadcastEvent = (boardId, event) => {
  if (!boardId || !event) {
    console.error("SSE broadcast skipped: board ID or event missing");
    return;
  }

  const clients = clientsByBoard.get(boardId);

  if (!clients || clients.size === 0) {
    return;
  }

  const payload = `data: ${JSON.stringify(event)}\n\n`;

  for (const client of clients) {
    if (client.destroyed || client.writableEnded) {
      clients.delete(client);
      continue;
    }

    try {
      client.write(payload);
    } catch (error) {
      console.error("SSE broadcast error:", error);
      clients.delete(client);
    }
  }

  // Remove empty board groups.
  if (clients.size === 0) {
    clientsByBoard.delete(boardId);
  }
};

// Useful for monitoring connected clients during development.
export const getSSEStats = () => {
  const stats = {};

  for (const [boardId, clients] of clientsByBoard.entries()) {
    stats[boardId] = clients.size;
  }

  return stats;
};
