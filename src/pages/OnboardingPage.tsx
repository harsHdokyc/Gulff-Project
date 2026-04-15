import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Sun, Moon, Loader2 } from "lucide-react";
import { authService } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

const OnboardingPage = () => {
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const { isDark, toggle: toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Step 1
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // Step 2
  const [tradeLicenseExpiry, setTradeLicenseExpiry] = useState("");
  const [visaCount, setVisaCount] = useState("");

  // Step 3
  const [employeeName, setEmployeeName] = useState("");
  const [employeeSalary, setEmployeeSalary] = useState("");

  // Step 4 (simplified)
  const [tradeLicenseDoc, setTradeLicenseDoc] = useState("");

  const next = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const prev = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 relative">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-3">Step {step} of {totalSteps}</p>
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h2 className="font-heading text-xl font-semibold text-foreground">Business Information</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tell us about your company.</p>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input placeholder="Acme Corp" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Owner/Manager Name</Label>
                <Input placeholder="John Doe" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp Contact Number</Label>
                <Input placeholder="+971 50 123 4567" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Business Type</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger><SelectValue placeholder="Select business type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="gym">Gym</SelectItem>
                    <SelectItem value="clinic">Clinic</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h2 className="font-heading text-xl font-semibold text-foreground">Compliance</h2>
            <p className="mt-1 text-sm text-muted-foreground">Basic compliance information.</p>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Trade License Expiry Date</Label>
                <Input type="date" value={tradeLicenseExpiry} onChange={(e) => setTradeLicenseExpiry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Number of Visas (optional)</Label>
                <Input placeholder="e.g., 5" value={visaCount} onChange={(e) => setVisaCount(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="animate-fade-in">
            <h2 className="font-heading text-xl font-semibold text-foreground">Employees</h2>
            <p className="mt-1 text-sm text-muted-foreground">Add your first employee.</p>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Number of Employees</Label>
                <Select value={employeeCount} onValueChange={setEmployeeCount}>
                  <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-5">1-5</SelectItem>
                    <SelectItem value="5-15">5-15</SelectItem>
                    <SelectItem value="15-50">15-50</SelectItem>
                    <SelectItem value="50+">50+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employee Name</Label>
                <Input placeholder="Employee name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Salary</Label>
                <Input placeholder="e.g., 5000" value={employeeSalary} onChange={(e) => setEmployeeSalary(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="animate-fade-in">
            <h2 className="font-heading text-xl font-semibold text-foreground">Upload Key Documents</h2>
            <p className="mt-1 text-sm text-muted-foreground">Upload your trade license and other documents.</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-md border border-border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">Drag & drop your trade license here, or click to browse</p>
                <Button variant="outline" size="sm" className="mt-3">Browse Files</Button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          {step > 1 ? (
            <Button variant="outline" onClick={prev}>Back</Button>
          ) : <div />}
          {step < totalSteps ? (
            <Button onClick={next}>Continue</Button>
          ) : (
            <Button onClick={() => window.location.href = "/dashboard"}>Go to Dashboard</Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
