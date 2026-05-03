import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuthContext } from "@/modules/auth/components/AuthContext";
import { toast } from "@/hooks/use-toast";
import { authService } from "@/modules/auth/services/auth";
import { useTranslation } from "react-i18next";

const SignInPage = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const { isDark, toggle } = useTheme();
  const { signIn, isSigningIn, refreshAuth } = useAuthContext();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await signIn({
        email: form.email,
        password: form.password
      });
      
      if (result.success) {
        await refreshAuth();
        toast({
          title: t('auth.welcomeBack'),
          description: t('auth.signIn')
        });
        // AuthGuard redirects once user is in cache (see useAuthQuery hydrateUserFromSession)
      } else {
        toast({
          title: t('errors.general'),
          description: result.error || t('errors.unknownError'),
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: t('errors.general'),
        description: error.message || t('errors.unknownError'),
        variant: "destructive"
      });
    }
  };

  const handleForgotPassword = async () => {
    const email = form.email.trim();
    if (!email) {
      toast({
        title: t('validation.required'),
        description: t('auth.email'),
        variant: "destructive",
      });
      return;
    }

    setIsSendingReset(true);
    try {
      const result = await authService.sendPasswordResetEmail(email);
      if (!result.success) {
        toast({
          title: t('errors.general'),
          description: result.error || t('errors.networkError'),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t('auth.resetPasswordSent'),
        description: t('auth.resetPasswordSent')
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      {/* Theme Toggle */}
      <button
        onClick={toggle}
        className="absolute top-4 right-4 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      
      <div className="w-full max-w-sm">
        <h1 className="font-heading text-2xl font-semibold text-foreground text-center">{t('auth.welcomeBack')}</h1>
        <p className="mt-2 text-sm text-muted-foreground text-center">{t('auth.loginToAccount')}</p>

        <form className="mt-8 space-y-4" onSubmit={handleSignIn}>
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="you@company.com" 
              value={form.email} 
              onChange={(e) => setForm({ ...form, email: e.target.value })} 
              disabled={isSigningIn}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <div className="relative">
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                placeholder="•••••••" 
                value={form.password} 
                onChange={(e) => setForm({ ...form, password: e.target.value })} 
                disabled={isSigningIn}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={isSigningIn}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSigningIn}>
            {isSigningIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('auth.signIn')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('auth.dontHaveAccount')}{" "}
          <Link to="/signup" className="text-primary hover:underline">{t('auth.createAccount')}</Link>
        </p>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={isSigningIn || isSendingReset}
            className="text-primary hover:underline disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSendingReset ? t('auth.resetPassword') : t('auth.forgotPassword')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignInPage;
