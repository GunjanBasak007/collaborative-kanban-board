import { Router } from "express";

import { addClient } from "../services/eventService.js";

import { createShareLink } from "../controllers/shareLinkController.js";

import {
  getBoard,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

import {
  resolveBoardAccess,
  requireBoardEditor,
  requireBoardOwner,
} from "../middleware/resolveBoardAccess.js";

const router = Router();

// Resolve and validate board access for every route.
router.use(resolveBoardAccess);

// Owner-only share link creation.
router.post(
  "/boards/share-links",
  requireBoardOwner,
  createShareLink
);

// Read access: owners, viewers and editors.
router.get("/board", getBoard);

// Write access: owners and guest editors.
router.post("/tasks", requireBoardEditor, createTask);
router.patch("/tasks/:id", requireBoardEditor, updateTask);
router.delete("/tasks/:id", requireBoardEditor, deleteTask);

// Board-specific real-time updates.
router.get("/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(": connected\n\n");

  const removeClient = addClient(res, req.board.id);

  const heartbeat = setInterval(() => {
    if (!res.destroyed && !res.writableEnded) {
      res.write(": heartbeat\n\n");
    }
  }, 20000);

  res.on("close", () => {
    clearInterval(heartbeat);
    removeClient();
  });
});

export default router;