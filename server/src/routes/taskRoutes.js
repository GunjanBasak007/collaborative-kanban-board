import { Router } from "express";
import { addClient } from "../services/eventService.js";
import {
  getBoard,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

const router = Router();

router.get("/board", getBoard);

router.post("/tasks", createTask);

router.patch("/tasks/:id", updateTask);

router.delete("/tasks/:id", deleteTask);

// GET /api/events
router.get("/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(": connected\n\n");

  const removeClient = addClient(res);

  // Heartbeat to maintain the connection
  const heartbeat = setInterval(() => {
    if (!res.destroyed && !res.writableEnded) {
      res.write(": heartbeat\n\n");
    }
  }, 20000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeClient();
  });
});

export default router;