import { useState } from "react";

import KanbanBoard from "./components/board/KanbanBoard";
import SignUpPage from "./components/auth/SignUpPage";
import LoginPage from "./components/auth/LoginPage";

import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import { signOut } from "./lib/auth";
import { getBoardShareToken } from "./lib/api";

type AuthPage = "login" | "signup";

const AppContent = () => {
  const { user, isLoading } = useAuth();

  const [authPage, setAuthPage] = useState<AuthPage>("login");
  const [logoutError, setLogoutError] = useState("");

  const isShareRoute = window.location.pathname.startsWith("/share/");
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

  // GUEST ACCESS THROUGH SHARE LINK.
  // This check intentionally happens before the auth-loading check.
  if (isShareRoute) {
    if (!shareToken) {
      return (
        <main className="auth-page">
          <div className="auth-card">
            <img src="/favicon.svg" alt="KanbanFlow" />
            <h2>Invalid share link</h2>
            <p>
              This link is not valid. Please ask the board owner
              for a new share link.
            </p>
          </div>
        </main>
      );
    }

    return <KanbanBoard />;
  }

  // RESTORE OWNER SESSION.
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

  // UNAUTHENTICATED OWNER.
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

  // AUTHENTICATED OWNER.
  const username =
    typeof user.user_metadata?.username === "string"
      ? user.user_metadata.username
      : user.email ?? "Account";

  return (
    <>
      <div className="app-session-toolbar">
        <span>
          Signed in as <strong>{username}</strong>
        </span>

        <button
          type="button"
          onClick={() => void handleSignOut()}
        >
          Sign out
        </button>
      </div>

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