
import { pool } from "../db/pool.js";
import { broadcastEvent } from "../services/eventService.js";

const VALID_STATUSES = [
  "Backlog",
  "Todo",
  "In Progress",
  "Done",
];

const VALID_PRIORITIES = ["low", "medium", "high"];

// GET /api/board
export const getBoard = async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        title,
        description,
        priority,
        assignee,
        status,
        position,
        updated_at AS "updatedAt"
      FROM tasks
      ORDER BY
        CASE status
          WHEN 'Backlog' THEN 1
          WHEN 'Todo' THEN 2
          WHEN 'In Progress' THEN 3
          WHEN 'Done' THEN 4
        END,
        position ASC;
    `;

    const result = await pool.query(query);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching board:", error);

    res.status(500).json({
      message: "Failed to fetch board",
    });
  }
};

// POST /api/tasks
export const createTask = async (req, res) => {
  const {
    title,
    description = "",
    priority = "medium",
    assignee,
    status = "Backlog",
  } = req.body ?? {};

  // Validate request
  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof assignee !== "string" ||
    !assignee.trim()
  ) {
    return res.status(400).json({
      message: "Title and assignee are required",
    });
  }

  if (
    typeof description !== "string" ||
    !VALID_PRIORITIES.includes(priority) ||
    !VALID_STATUSES.includes(status)
  ) {
    return res.status(400).json({
      message: "Invalid description, priority or status",
    });
  }

  let client;

  try {
    client = await pool.connect();

    await client.query("BEGIN");

    // Serialize task mutations to maintain consistent positions.
    await client.query(
      "LOCK TABLE tasks IN SHARE ROW EXCLUSIVE MODE"
    );

    // Calculate the next position in this column.
    const positionResult = await client.query(
      `SELECT COALESCE(MAX(position), -1) + 1 AS position
       FROM tasks
       WHERE status = $1`,
      [status]
    );

    const position = Number(positionResult.rows[0].position);

    // Insert the new task.
    const result = await client.query(
      `INSERT INTO tasks (
        title,
        description,
        priority,
        assignee,
        status,
        position
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        title,
        description,
        priority,
        assignee,
        status,
        position,
        updated_at AS "updatedAt"`,
      [
        title.trim(),
        description,
        priority,
        assignee.trim(),
        status,
        position,
      ]
    );

    await client.query("COMMIT");

    // Broadcast only after successful database commit.
    broadcastEvent({
      type: "TASK_CREATED",
      task: result.rows[0],
    });

    res.status(201).json(result.rows[0]);

  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Error creating task:", error);

    res.status(500).json({
      message: "Failed to create task",
    });

  } finally {
    client?.release();
  }
};

// Validate UUID
const isUUID = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

// PATCH /api/tasks/:id
export const updateTask = async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  if (!isUUID(id)) {
    return res.status(400).json({
      message: "Invalid task ID",
    });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      message: "Invalid request body",
    });
  }

  const allowedFields = [
    "title",
    "description",
    "priority",
    "assignee",
    "status",
    "position",
  ];

  const unsupportedFields = Object.keys(body).filter(
    (key) => !allowedFields.includes(key)
  );

  if (unsupportedFields.length > 0) {
    return res.status(400).json({
      message: `Unsupported fields: ${unsupportedFields.join(", ")}`,
    });
  }

  if (Object.keys(body).length === 0) {
    return res.status(400).json({
      message: "No fields to update",
    });
  }

  if (
    "title" in body &&
    (typeof body.title !== "string" || !body.title.trim())
  ) {
    return res.status(400).json({
      message: "Title cannot be empty",
    });
  }

  if (
    "description" in body &&
    typeof body.description !== "string"
  ) {
    return res.status(400).json({
      message: "Invalid description",
    });
  }

  if (
    "priority" in body &&
    !VALID_PRIORITIES.includes(body.priority)
  ) {
    return res.status(400).json({
      message: "Invalid priority",
    });
  }

  if (
    "assignee" in body &&
    (typeof body.assignee !== "string" || !body.assignee.trim())
  ) {
    return res.status(400).json({
      message: "Invalid assignee",
    });
  }

  if (
    "status" in body &&
    !VALID_STATUSES.includes(body.status)
  ) {
    return res.status(400).json({
      message: "Invalid status",
    });
  }

  if (
    "position" in body &&
    (!Number.isInteger(body.position) || body.position < 0)
  ) {
    return res.status(400).json({
      message: "Invalid position",
    });
  }

  let client;

  try {
    client = await pool.connect();

    await client.query("BEGIN");

    // Serialize task mutations to preserve column ordering.
    await client.query(
      "LOCK TABLE tasks IN SHARE ROW EXCLUSIVE MODE"
    );

    // Find and lock the task.
    const taskResult = await client.query(
      `SELECT
        id,
        title,
        description,
        priority,
        assignee,
        status,
        position,
        updated_at AS "updatedAt"
       FROM tasks
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (taskResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Task not found",
      });
    }

    const current = taskResult.rows[0];

    const updated = {
      title: "title" in body ? body.title.trim() : current.title,
      description:
        "description" in body
          ? body.description
          : current.description,
      priority:
        "priority" in body ? body.priority : current.priority,
      assignee:
        "assignee" in body
          ? body.assignee.trim()
          : current.assignee,
      status: "status" in body ? body.status : current.status,
    };

    const statusChanged = updated.status !== current.status;
    const positionProvided = "position" in body;
    const needsReorder = statusChanged || positionProvided;

    let updatedTask;

    // Normal edit without changing status or position.
    if (!needsReorder) {
      const result = await client.query(
        `UPDATE tasks
         SET title = $1,
             description = $2,
             priority = $3,
             assignee = $4,
             updated_at = NOW()
         WHERE id = $5
         RETURNING
           id,
           title,
           description,
           priority,
           assignee,
           status,
           position,
           updated_at AS "updatedAt"`,
        [
          updated.title,
          updated.description,
          updated.priority,
          updated.assignee,
          id,
        ]
      );

      updatedTask = result.rows[0];

    } else {
      // Fetch remaining tasks in the source column.
      const sourceResult = await client.query(
        `SELECT id, position
         FROM tasks
         WHERE status = $1 AND id <> $2
         ORDER BY position ASC, id ASC`,
        [current.status, id]
      );

      // Fetch tasks in the destination column.
      const destinationResult = statusChanged
        ? await client.query(
            `SELECT id, position
             FROM tasks
             WHERE status = $1
             ORDER BY position ASC, id ASC`,
            [updated.status]
          )
        : sourceResult;

      const destinationTasks = [...destinationResult.rows];

      // Calculate the destination position.
      const requestedPosition = positionProvided
        ? body.position
        : statusChanged
          ? destinationTasks.length
          : current.position;

      const targetPosition = Math.min(
        requestedPosition,
        destinationTasks.length
      );

      // Insert the moved task at its new position.
      destinationTasks.splice(targetPosition, 0, {
        id: current.id,
      });

      // Compact the source column after cross-column movement.
      if (statusChanged) {
        for (let index = 0; index < sourceResult.rows.length; index++) {
          const task = sourceResult.rows[index];

          if (Number(task.position) !== index) {
            await client.query(
              `UPDATE tasks
               SET position = $1, updated_at = NOW()
               WHERE id = $2`,
              [index, task.id]
            );
          }
        }
      }

      // Update destination ordering.
      for (let index = 0; index < destinationTasks.length; index++) {
        const task = destinationTasks[index];

        if (task.id === id) {
          const result = await client.query(
            `UPDATE tasks
             SET title = $1,
                 description = $2,
                 priority = $3,
                 assignee = $4,
                 status = $5,
                 position = $6,
                 updated_at = NOW()
             WHERE id = $7
             RETURNING
               id,
               title,
               description,
               priority,
               assignee,
               status,
               position,
               updated_at AS "updatedAt"`,
            [
              updated.title,
              updated.description,
              updated.priority,
              updated.assignee,
              updated.status,
              index,
              id,
            ]
          );

          updatedTask = result.rows[0];

        } else if (Number(task.position) !== index) {
          await client.query(
            `UPDATE tasks
             SET position = $1, updated_at = NOW()
             WHERE id = $2`,
            [index, task.id]
          );
        }
      }
    }

    await client.query("COMMIT");

    // Broadcast update after successful database commit.
    broadcastEvent({
      type: "TASK_UPDATED",
      task: updatedTask,
    });

    return res.status(200).json(updatedTask);

  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Error updating task:", error);

    return res.status(500).json({
      message: "Failed to update task",
    });

  } finally {
    client?.release();
  }
};

// DELETE /api/tasks/:id
export const deleteTask = async (req, res) => {
  const { id } = req.params;

  if (!isUUID(id)) {
    return res.status(400).json({
      message: "Invalid task ID",
    });
  }

  let client;

  try {
    client = await pool.connect();

    await client.query("BEGIN");

    // Serialize task mutations.
    await client.query(
      "LOCK TABLE tasks IN SHARE ROW EXCLUSIVE MODE"
    );

    // Find task before deleting.
    const taskResult = await client.query(
      `SELECT id, status
       FROM tasks
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (taskResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Task not found",
      });
    }

    const status = taskResult.rows[0].status;

    // Delete task.
    await client.query(
      "DELETE FROM tasks WHERE id = $1",
      [id]
    );

    // Recalculate positions of remaining tasks.
    await client.query(
      `WITH ordered_tasks AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            ORDER BY position ASC, id ASC
          ) - 1 AS new_position
        FROM tasks
        WHERE status = $1
      )
      UPDATE tasks AS t
      SET
        position = ordered_tasks.new_position,
        updated_at = NOW()
      FROM ordered_tasks
      WHERE t.id = ordered_tasks.id
        AND t.position <> ordered_tasks.new_position`,
      [status]
    );

    await client.query("COMMIT");

    // Broadcast deletion after successful database commit.
    broadcastEvent({
      type: "TASK_DELETED",
      taskId: id,
    });

    return res.status(200).json({
      message: "Task deleted successfully",
      deletedTaskId: id,
    });

  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Error deleting task:", error);

    return res.status(500).json({
      message: "Failed to delete task",
    });

  } finally {
    client?.release();
  }
};
