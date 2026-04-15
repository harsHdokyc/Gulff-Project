import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon, Loader2 } from "lucide-react";
import { authService } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

const SignUpPage = () => {
  const [form, setForm] = useState({ company: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOTP] = useState("");
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await authService.signUp({
      company: form.company,
      email: form.email,
      password: form.password
    });

    if (result.success) {
      toast({
        title: "Account created",
        description: "Please check your email for verification code."
      });
      setShowOTP(true);
    } else {
      toast({
        title: "Sign up failed",
        description: result.error,
        variant: "destructive"
      });
    }

    setLoading(false);
  };

  const handleOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await authService.verifyOTP(otp, form.email);

    if (result.success) {
      toast({
        title: "Email verified",
        description: "Redirecting to onboarding..."
      });
      navigate("/onboarding");
    } else {
      toast({
        title: "Verification failed",
        description: result.error,
        variant: "destructive"
      });
    }

    setLoading(false);
  };

  const resendOTP = async () => {
    const result = await authService.sendOTP(form.email);
    
    if (result.success) {
      toast({
        title: "Code resent",
        description: "Check your email for the new verification code."
      });
    } else {
      toast({
        title: "Failed to resend",
        description: result.error,
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
                disabled={loading}
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
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="•••••••" 
                value={form.password} 
                onChange={(e) => setForm({ ...form, password: e.target.value })} 
                disabled={loading}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                disabled={loading}
                maxLength={8}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Email
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={resendOTP}
              disabled={loading}
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
