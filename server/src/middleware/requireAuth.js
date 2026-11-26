
import { supabase } from "../lib/supabase.js";

export const requireAuth = async (req, res, next) => {
  try {
    // 1. Extract Authorization header
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // 2. Extract Bearer token
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return res.status(401).json({
        message: "Invalid Authorization header",
      });
    }

    const token = match[1].trim();

    // 3. Verify token using Supabase Auth server
    const { data, error } = await supabase.auth.getUser(token);

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

    // 4. Attach verified identity to Express request
    req.user = {
      id: data.user.id,
      email: data.user.email ?? null,
    };

    // 5. Continue to protected route
    return next();

  } catch (error) {
    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      message: "Authentication verification failed",
    });
  }
};
