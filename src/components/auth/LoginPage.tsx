
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";

import { signIn } from "../../lib/auth";
import "./auth.css";

type LoginPageProps = {
  onSwitchToSignup?: () => void;
};

const LoginPage = ({ onSwitchToSignup }: LoginPageProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      await signIn(email, password);

      // The upcoming authentication provider will detect
      // the Supabase session and display the Kanban board.
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to log in. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        {/* BRAND */}
        <div className="auth-brand">
          <img src="/favicon.svg" alt="KanbanFlow" />

          <span>
            Kanban<span className="auth-brand-accent">Flow</span>
          </span>
        </div>

        {/* HEADING */}
        <div className="auth-heading">
          <span className="auth-eyebrow">WELCOME BACK</span>

          <h1>Login to your account</h1>

          <p>
            Pick up where you left off and keep your work moving.
          </p>
        </div>

        {/* LOGIN FORM */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="login-email">
              Email address
            </label>

            <input
              id="login-email"
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
            <label htmlFor="login-password">
              Password
            </label>

            <div className="auth-password-wrapper">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={isLoading}
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="auth-message auth-error" role="alert">
              {error}
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
                Logging in...
              </>
            ) : (
              <>
                Login
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* SIGNUP LINK */}
        {onSwitchToSignup && (
          <div className="auth-footer">
            Don't have an account?{" "}
            <button type="button" onClick={onSwitchToSignup}>
              Create account
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

export default LoginPage;
