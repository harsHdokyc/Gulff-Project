import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ROUTES } from "@/routes/constants";
import { useAuthContext } from "@/contexts/AuthContext";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isDark, toggle } = useTheme();
  const { isOnboarded } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const syncSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(!!session);
      setCheckingSession(false);
    };

    void syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
      setCheckingSession(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      toast({
        title: "Passwords do not match",
        description: "Please enter the same password in both fields.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Use at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authService.updatePassword(password);
      if (!result.success) {
        toast({
          title: "Could not update password",
          description: result.error || "Something went wrong",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Password updated",
        description: "You can continue using your account.",
      });
      navigate(isOnboarded ? ROUTES.PROTECTED.DASHBOARD : ROUTES.ONBOARDING, { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
        <button
          type="button"
          onClick={toggle}
          className="absolute top-4 right-4 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="font-heading text-2xl font-semibold text-foreground">Link invalid or expired</h1>
          <p className="text-sm text-muted-foreground">
            Request a new reset link from the sign-in page.
          </p>
          <Button asChild className="w-full">
            <Link to={ROUTES.AUTH.SIGNIN}>Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      <button
        type="button"
        onClick={toggle}
        className="absolute top-4 right-4 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="w-full max-w-sm">
        <h1 className="font-heading text-2xl font-semibold text-foreground text-center">Set a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground text-center">Choose a strong password for your account.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="•••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="•••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={isSubmitting}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to={ROUTES.AUTH.SIGNIN} className="text-primary hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
