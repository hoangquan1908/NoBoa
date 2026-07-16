import { useState, useEffect } from "react";
import { User, Lock, Eye, EyeOff, Loader2, StickyNote, X } from "lucide-react";
import { useAuthStore } from "../store/authStore";

type Mode = "signin" | "signup";

interface AuthPageProps {
  onClose: () => void;
}

export function AuthPage({ onClose }: AuthPageProps) {
  const { signIn, signUp, authLoading, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Clear errors when switching mode
  useEffect(() => {
    clearError();
    setLocalError(null);
    setPassword("");
    setConfirmPassword("");
  }, [mode, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!username.trim()) {
      setLocalError("Username is required.");
      return;
    }
    if (username.trim().length < 3) {
      setLocalError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setLocalError("Passwords do not match.");
        return;
      }
      await signUp(username, password);
    } else {
      await signIn(username, password);
    }
    
    // Check if error after auth
    const currentError = useAuthStore.getState().error;
    if (!currentError) {
       onClose();
    }
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      {/* Background decorative blobs */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "-10%",
            width: "50vw",
            height: "50vw",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, hsla(var(--primary) / 0.12) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-20%",
            right: "-10%",
            width: "45vw",
            height: "45vw",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, hsla(var(--primary) / 0.08) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
        style={{ padding: "2rem" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors"
        >
          <X size={16} />
        </button>
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex items-center justify-center rounded-xl mb-3"
            style={{
              width: 48,
              height: 48,
              background: "hsl(var(--primary))",
            }}
          >
            <StickyNote size={24} color="hsl(var(--primary-foreground))" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            NoBoa
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {mode === "signin" ? "Welcome back!" : "Create a new account"}
          </p>
        </div>

        {/* Mode tabs */}
        <div className="flex rounded-lg bg-muted/60 p-1 mb-6 gap-1">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === m
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Username */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Username
            </label>
            <div className="relative">
              <User
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id="auth-username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="yourname"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Password
            </label>
            <div className="relative">
              <Lock
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id="auth-password"
                type={showPass ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Confirm Password (signup only) */}
          {mode === "signup" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  id="auth-confirm-password"
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {displayError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
              {displayError}
            </div>
          )}

          {/* Submit */}
          <button
            id="auth-submit"
            type="submit"
            disabled={authLoading}
            className="mt-1 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            {authLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {mode === "signin" ? "Signing in..." : "Creating account..."}
              </>
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
