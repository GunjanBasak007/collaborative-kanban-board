
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";

import { signUp } from "../../lib/auth";
import "./auth.css";

type SignUpPageProps = {
  onSwitchToLogin?: () => void;
};

const SignUpPage = ({ onSwitchToLogin }: SignUpPageProps) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
      setError(
        "Username must be 3–24 characters using lowercase letters, numbers or underscores."
      );
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const { user, session } = await signUp({
        username: normalizedUsername,
        email: normalizedEmail,
        password,
      });

      if (!user) {
        throw new Error("Account creation failed. Please try again.");
      }

      if (session) {
        setSuccess("Account created successfully!");
      } else {
        setSuccess(
          "Account created! Please check your email and confirm your address before logging in."
        );
      }

      setPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <img src="/favicon.svg" alt="KanbanFlow" />

          <span>
            Kanban<span className="auth-brand-accent">Flow</span>
          </span>
        </div>

        <div className="auth-heading">
          <span className="auth-eyebrow">GET STARTED</span>

          <h1>Create your account</h1>

          <p>
            Organize your work and collaborate with your team.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="signup-username">Username</label>

            <input
              id="signup-username"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              minLength={3}
              maxLength={24}
              required
              disabled={isLoading}
            />

            <span className="auth-field-hint">
              3–24 characters. Letters, numbers and underscores only.
            </span>
          </div>

          <div className="auth-field">
            <label htmlFor="signup-email">Email address</label>

            <input
              id="signup-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-password">Password</label>

            <div className="auth-password-wrapper">
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                disabled={isLoading}
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            <span className="auth-field-hint">
              Use at least 8 characters.
            </span>
          </div>

          {error && (
            <div className="auth-message auth-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-message auth-success" role="status">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoaderCircle className="auth-spinner" size={18} />
                Creating account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {onSwitchToLogin && (
          <div className="auth-footer">
            Already have an account?{" "}
            <button type="button" onClick={onSwitchToLogin}>
              Log in
            </button>
          </div>
        )}
      </div>

      <p className="auth-bottom-text">
        Plan. Organize. Collaborate.
      </p>
    </main>
  );
};

export default SignUpPage;
