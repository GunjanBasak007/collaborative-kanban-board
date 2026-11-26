import { useState } from "react";

import KanbanBoard from "./components/board/KanbanBoard";
import SignUpPage from "./components/auth/SignUpPage";
import LoginPage from "./components/auth/LoginPage";

import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import { signOut } from "./lib/auth";
import { getBoardShareToken } from "./lib/api";

type AuthPage = "login" | "signup";

type AppTopBarProps = {
  username?: string;
  onSignOut?: () => void;
};

const AppTopBar = ({
  username,
  onSignOut,
}: AppTopBarProps) => {
  return (
    <header className="app-topbar">
      <div className="app-topbar-inner">

        {/* BRAND */}
        <div className="app-topbar-brand">
          <img
            src="/favicon.svg"
            alt="KanbanFlow logo"
            className="brand-mark"
          />

          <span className="brand-wordmark">
            Kanban<span>Flow</span>
          </span>
        </div>

        {/* ACCOUNT ACTIONS */}
        {username && onSignOut && (
          <div className="app-account-actions">
            <span className="app-account-label">
              Signed in as <strong>{username}</strong>
            </span>

            <button
              type="button"
              onClick={onSignOut}
              className="app-signout-button"
            >
              Sign out
            </button>
          </div>
        )}

      </div>
    </header>
  );
};

const AppContent = () => {
  const { user, isLoading } = useAuth();

  const [authPage, setAuthPage] = useState<AuthPage>("login");
  const [logoutError, setLogoutError] = useState("");

  const isShareRoute =
    window.location.pathname.startsWith("/share/");

  const shareToken = getBoardShareToken();

  const handleSignOut = async () => {
    setLogoutError("");

    try {
      await signOut();
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : "Unable to sign out. Please try again."
      );
    }
  };

  // GUEST ACCESS.
  if (isShareRoute) {
    if (!shareToken) {
      return (
        <main className="auth-page">
          <div className="auth-card">
            <img src="/favicon.svg" alt="KanbanFlow" />
            <h2>Invalid share link</h2>
            <p>
              This link is not valid. Please ask the board
              owner for a new share link.
            </p>
          </div>
        </main>
      );
    }

    return (
      <>
        <AppTopBar />
        <KanbanBoard />
      </>
    );
  }

  // RESTORE SESSION.
  if (isLoading) {
    return (
      <main className="auth-page">
        <div className="auth-card auth-loading">
          <img src="/favicon.svg" alt="KanbanFlow" />
          <p>Restoring your session...</p>
        </div>
      </main>
    );
  }

  // UNAUTHENTICATED USER.
  if (!user) {
    return authPage === "signup" ? (
      <SignUpPage
        onSwitchToLogin={() => setAuthPage("login")}
      />
    ) : (
      <LoginPage
        onSwitchToSignup={() => setAuthPage("signup")}
      />
    );
  }

  // AUTHENTICATED USER.
  const username =
    typeof user.user_metadata?.username === "string"
      ? user.user_metadata.username
      : user.email ?? "Account";

  return (
    <>
      <AppTopBar
        username={username}
        onSignOut={() => void handleSignOut()}
      />

      {logoutError && (
        <p className="api-error" role="alert">
          {logoutError}
        </p>
      )}

      <KanbanBoard />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;