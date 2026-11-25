const clients = new Set();

// Register a connected client
export const addClient = (res) => {
  clients.add(res);

  console.log(`SSE client connected. Total: ${clients.size}`);

  return () => {
    clients.delete(res);

    console.log(`SSE client disconnected. Total: ${clients.size}`);
  };
};

// Broadcast an event to all connected clients
export const broadcastEvent = (event) => {
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
};