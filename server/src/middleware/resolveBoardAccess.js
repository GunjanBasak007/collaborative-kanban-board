import { createHash } from "node:crypto";

import { pool } from "../db/pool.js";
import { supabase } from "../lib/supabase.js";

// Generate SHA-256 hash for share tokens.
// Only token hashes are stored in Neon.
const hashShareToken = (token) =>
  createHash("sha256").update(token).digest("hex");

// ==========================================
// RESOLVE BOARD ACCESS
// Supports:
// 1. Authenticated board owners
// 2. Guests using share links
// ==========================================

export const resolveBoardAccess = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    const shareToken = req.headers["x-board-share-token"];

    // ==========================================
    // OWNER ACCESS THROUGH SUPABASE AUTH
    // ==========================================

    if (authorization) {
      const match = authorization.match(/^Bearer\s+(.+)$/i);

      if (!match) {
        return res.status(401).json({
          message: "Invalid Authorization header",
        });
      }

      const accessToken = match[1].trim();

      // Verify Supabase access token.
      const { data, error } = await supabase.auth.getUser(
        accessToken
      );

      if (error || !data?.user) {
        console.error("Supabase user verification failed:", {
          message: error?.message,
          status: error?.status,
          code: error?.code,
        });

        return res.status(401).json({
          message: "Invalid or expired access token",
        });
      }

      const user = data.user;

      // Automatically create a board if this user
      // does not already have one.
      //
      // ON CONFLICT prevents duplicate boards when
      // multiple requests arrive simultaneously.
      await pool.query(
        `INSERT INTO boards (owner_id, name)
         VALUES ($1, $2)
         ON CONFLICT (owner_id) DO NOTHING`,
        [user.id, "My Kanban Board"]
      );

      // Fetch the owner's board.
      const result = await pool.query(
        `SELECT
           id,
           owner_id,
           name
         FROM boards
         WHERE owner_id = $1
         LIMIT 1`,
        [user.id]
      );

      if (result.rows.length === 0) {
        return res.status(500).json({
          message: "Unable to provision your board",
        });
      }

      // Attach authenticated user information.
      req.user = {
        id: user.id,
        email: user.email ?? null,
      };

      // Attach the resolved board.
      req.board = result.rows[0];

      // Mark this request as owner access.
      req.boardAccess = {
        mode: "owner",
        permission: "owner",
      };

      return next();
    }

    // ==========================================
    // GUEST ACCESS THROUGH SHARE TOKEN
    // ==========================================

    if (
      typeof shareToken === "string" &&
      shareToken.trim()
    ) {
      const normalizedToken = shareToken.trim();

      // Validate the expected 32-byte base64url token.
      if (!/^[A-Za-z0-9_-]{43}$/.test(normalizedToken)) {
        return res.status(401).json({
          message: "Invalid share token",
        });
      }

      // Hash the incoming token before database lookup.
      const tokenHash = hashShareToken(normalizedToken);

      // Verify that the link exists, is not revoked,
      // and has not expired.
      const result = await pool.query(
        `SELECT
           b.id,
           b.owner_id,
           b.name,
           s.id AS share_link_id,
           s.permission
         FROM board_share_links AS s
         INNER JOIN boards AS b
           ON b.id = s.board_id
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
          message: "Invalid, expired or revoked share link",
        });
      }

      const share = result.rows[0];

      // Guests do not have Supabase user sessions.
      req.user = null;

      // Attach the shared board.
      req.board = {
        id: share.id,
        owner_id: share.owner_id,
        name: share.name,
      };

      // Attach guest permission information.
      req.boardAccess = {
        mode: "guest",
        permission: share.permission,
        shareLinkId: share.share_link_id,
      };

      return next();
    }

    // ==========================================
    // NO VALID BOARD CREDENTIALS
    // ==========================================

    return res.status(401).json({
      message: "Board access required",
    });

  } catch (error) {
    console.error("Error resolving board access:", error);

    return res.status(500).json({
      message: "Failed to resolve board access",
    });
  }
};

// ==========================================
// OWNER OR EDITOR ACCESS
// ==========================================

export const requireBoardEditor = (req, res, next) => {
  const access = req.boardAccess;

  if (!access) {
    return res.status(403).json({
      message: "Board access not resolved",
    });
  }

  // Owners always have editing permission.
  // Guests can edit only if their share link grants editor access.
  if (
    access.mode === "owner" ||
    (
      access.mode === "guest" &&
      access.permission === "editor"
    )
  ) {
    return next();
  }

  return res.status(403).json({
    message: "You have read-only access to this board",
  });
};

// ==========================================
// OWNER-ONLY ACCESS
// ==========================================

export const requireBoardOwner = (req, res, next) => {
  const access = req.boardAccess;

  if (!access || access.mode !== "owner") {
    return res.status(403).json({
      message: "Only the board owner can manage share links",
    });
  }

  return next();
};