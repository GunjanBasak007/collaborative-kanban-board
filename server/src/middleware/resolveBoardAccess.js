
import { createHash } from "node:crypto";

import { pool } from "../db/pool.js";
import { supabase } from "../lib/supabase.js";

const hashShareToken = (token) =>
  createHash("sha256").update(token).digest("hex");

export const resolveBoardAccess = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    const shareToken = req.headers["x-board-share-token"];

    // PATH 1: AUTHENTICATED BOARD OWNER
    if (authorization) {
      const match = authorization.match(/^Bearer\s+(.+)$/i);

      if (!match) {
        return res.status(401).json({
          message: "Invalid Authorization header",
        });
      }

      const accessToken = match[1].trim();

      const { data, error } = await supabase.auth.getUser(accessToken);

      if (error || !data?.user) {
        return res.status(401).json({
          message: "Invalid or expired access token",
        });
      }

      const user = data.user;

      // Find the board belonging to this authenticated user.
      const result = await pool.query(
        `SELECT id, owner_id, name
         FROM boards
         WHERE owner_id = $1
         ORDER BY created_at ASC
         LIMIT 1`,
        [user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "No board found for this user",
        });
      }

      req.user = {
        id: user.id,
        email: user.email ?? null,
      };

      req.board = result.rows[0];

      req.boardAccess = {
        mode: "owner",
        permission: "owner",
      };

      return next();
    }

    // PATH 2: GUEST ACCESS THROUGH A SHARE LINK
    if (typeof shareToken === "string" && shareToken.trim()) {
      const normalizedToken = shareToken.trim();

      // Our tokens are generated from 32 random bytes
      // and encoded as URL-safe Base64.
      if (!/^[A-Za-z0-9_-]{43}$/.test(normalizedToken)) {
        return res.status(401).json({
          message: "Invalid share token",
        });
      }

      const tokenHash = hashShareToken(normalizedToken);

      const result = await pool.query(
        `SELECT
           b.id,
           b.owner_id,
           b.name,
           s.id AS share_link_id,
           s.permission
         FROM board_share_links s
         INNER JOIN boards b ON b.id = s.board_id
         WHERE s.token_hash = $1
           AND s.revoked_at IS NULL
           AND (
             s.expires_at IS NULL
             OR s.expires_at > NOW()
           )
         LIMIT 1`,
        [tokenHash]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          message: "Share link is invalid, expired or revoked",
        });
      }

      const share = result.rows[0];

      req.user = null;

      req.board = {
        id: share.id,
        owner_id: share.owner_id,
        name: share.name,
      };

      req.boardAccess = {
        mode: "guest",
        permission: share.permission,
        shareLinkId: share.share_link_id,
      };

      return next();
    }

    // NO OWNER TOKEN OR GUEST TOKEN
    return res.status(401).json({
      message: "Board access required",
    });
  } catch (error) {
    console.error("Board access resolution error:", error);

    return res.status(500).json({
      message: "Failed to resolve board access",
    });
  }
};

// Middleware for operations that modify a board.
export const requireBoardEditor = (req, res, next) => {
  const access = req.boardAccess;

  if (!access) {
    return res.status(403).json({
      message: "Board access not resolved",
    });
  }

  if (
    access.mode === "owner" ||
    access.permission === "editor"
  ) {
    return next();
  }

  return res.status(403).json({
    message: "You have read-only access to this board",
  });
};


// Only the board owner can manage sharing settings.
export const requireBoardOwner = (req, res, next) => {
  const access = req.boardAccess;

  if (!access || access.mode !== "owner") {
    return res.status(403).json({
      message: "Only the board owner can manage share links",
    });
  }

  return next();
};