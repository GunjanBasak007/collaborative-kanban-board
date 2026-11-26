import "dotenv/config";

import express from "express";
import cors from "cors";

import { requireAuth } from "./middleware/requireAuth.js";
import { pool } from "./db/pool.js";
import taskRoutes from "./routes/taskRoutes.js";

const app = express();

// Allowed frontend origins.
const allowedOrigins = new Set(
  (
    process.env.CORS_ORIGINS ||
    [
      "http://localhost:5173",
      "https://collaborative-kanban-board-nu.vercel.app",
    ].join(",")
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

// CORS configuration.
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (e.g. curl).
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },

    methods: [
      "GET",
      "POST",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Board-Share-Token",
    ],
  })
);

app.use(express.json());

// HEALTH CHECK
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.status(200).json({
      message: "Server and database connected successfully!",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

// VERIFY AUTHENTICATED USER IDENTITY
app.get("/api/auth/me", requireAuth, (req, res) => {
  res.status(200).json({
    message: "Authentication successful",
    user: {
      id: req.user.id,
      email: req.user.email,
    },
  });
});

// TASK AND BOARD ROUTES
app.use("/api", taskRoutes);

// START SERVER
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});