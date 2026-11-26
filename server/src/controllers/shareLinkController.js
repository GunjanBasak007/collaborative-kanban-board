import { randomBytes, createHash } from "node:crypto";
import { pool } from "../db/pool.js";

export const createShareLink = async (req, res) => {
  try {
    // Only create links for the resolved board.
    const boardId = req.board?.id;

    if (!boardId || req.boardAccess?.mode !== "owner") {
      return res.status(403).json({
        message: "Only the board owner can create share links",
      });
    }

    // Generate a cryptographically secure 256-bit token.
    const shareToken = randomBytes(32).toString("base64url");

    // Store only the SHA-256 hash in PostgreSQL.
    const tokenHash = createHash("sha256")
      .update(shareToken)
      .digest("hex");

    // New links are editor links and do not expire by default.
    const result = await pool.query(
      `INSERT INTO board_share_links (
        board_id,
        token_hash,
        permission
      )
      VALUES ($1, $2, $3)
      RETURNING
        id,
        permission,
        created_at AS "createdAt",
        expires_at AS "expiresAt"`,
      [boardId, tokenHash, "editor"]
    );

    // Return the raw token only once.
    return res.status(201).json({
      message: "Share link created successfully",
      shareToken,
      shareLink: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating share link:", error);

    return res.status(500).json({
      message: "Failed to create share link",
    });
  }
};