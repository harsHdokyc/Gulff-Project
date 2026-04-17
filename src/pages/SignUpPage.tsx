/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const SignUpPage = () => {
  const [form, setForm] = useState({ company: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const showOTP = searchParams.get("step") === "verify";
  const [otp, setOTP] = useState("");
  const { isDark, toggle } = useTheme();
  const { signUp, verifyOTP, sendOTP, isSigningUp, isVerifyingOTP, isSendingOTP } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    const emailFromParams = searchParams.get("email");
    if (showOTP && emailFromParams && form.email !== emailFromParams) {
      setForm((prev) => ({ ...prev, email: emailFromParams }));
    }
  }, [showOTP, searchParams, form.email]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await signUp({
        company: form.company,
        email: form.email,
        password: form.password
      });

      if (!result.success) {
        throw new Error(result.error || "An error occurred");
      }

      toast({
        title: "Account created",
        description: "Please check your email for verification code."
      });
      setSearchParams({ step: "verify", email: form.email });
    } catch (error: any) {
      const errorMessage = error.message || "An error occurred";
      const isDuplicateEmail = errorMessage.includes("already exists") || errorMessage.includes("account with this email");
      
      toast({
        title: isDuplicateEmail ? "Email already registered" : "Sign up failed",
        description: isDuplicateEmail ? 
          `${errorMessage}. Please sign in to your account.` : 
          errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await verifyOTP({ token: otp, email: form.email });
      if (!result.success) {
        throw new Error(result.error || "An error occurred");
      }

      toast({
        title: "Email verified",
        description: "Redirecting to onboarding..."
      });
      navigate("/onboarding");
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  };

  const resendOTP = async () => {
    try {
      const result = await sendOTP(form.email);
      if (!result.success) {
        throw new Error(result.error || "An error occurred");
      }
      
      toast({
        title: "Code resent",
        description: "Check your email for the new verification code."
      });
    } catch (error: any) {
      toast({
        title: "Failed to resend",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
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
        <h1 className="font-heading text-2xl font-semibold text-foreground text-center">
          {showOTP ? "Verify Email" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          {showOTP 
            ? "Enter the 8-digit code sent to your email"
            : "Start managing compliance in minutes."
          }
        </p>

        {!showOTP ? (
          <form className="mt-8 space-y-4" onSubmit={handleSignUp}>
            <div className="space-y-2">
              <Label htmlFor="company">Company Name</Label>
              <Input 
                id="company" 
                placeholder="Acme Corp" 
                value={form.company} 
                onChange={(e) => setForm({ ...form, company: e.target.value })} 
                disabled={isSigningUp}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@company.com" 
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
                disabled={isSigningUp}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="•••••••" 
                  value={form.password} 
                  onChange={(e) => setForm({ ...form, password: e.target.value })} 
                  disabled={isSigningUp}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isSigningUp}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSigningUp}>
              {isSigningUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleOTPVerification}>
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input 
                id="otp" 
                placeholder="12345678" 
                value={otp} 
                onChange={(e) => setOTP(e.target.value.replace(/\D/g, '').slice(0, 8))} 
                disabled={isVerifyingOTP}
                maxLength={8}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isVerifyingOTP}>
              {isVerifyingOTP && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Email
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={resendOTP}
              disabled={isSendingOTP}
            >
              Resend Code
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/signin" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;
