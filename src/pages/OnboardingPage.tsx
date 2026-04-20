/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { Sun, Moon, Loader2 } from "lucide-react";
import { onboardingService } from "@/lib/onboarding";
import { toast } from "@/hooks/use-toast";
import { validateAlphabeticText, isValidAlphabeticInput, validateAlphanumericText, isValidAlphanumericInput, isValidPhoneNumber, isValidNumericInput, getMinDate } from "@/lib/formValidation";

const OnboardingPage = () => {
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const { isDark, toggle: toggleTheme } = useTheme();
  const { user, completeOnboarding, isCompletingOnboarding } = useAuthContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Step 1
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Step 2
  const [tradeLicenseExpiry, setTradeLicenseExpiry] = useState("");
  const [visaCount, setVisaCount] = useState("");

  // Step 3
  const [employeeName, setEmployeeName] = useState("");
  const [employeeSalary, setEmployeeSalary] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");

  // Step 4 (simplified)
  const [tradeLicenseDoc, setTradeLicenseDoc] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user should be here and prefill company name
  useEffect(() => {
    if (user && user.user_metadata?.onboarding_completed) {
      navigate("/dashboard", { replace: true });
    }
    
    // Prefill company name from user metadata
    if (user?.user_metadata?.company) {
      setCompanyName(user.user_metadata.company);
    }
  }, [user, navigate]);

  const next = async () => {
    if (step < totalSteps) {
      // Validate current step before proceeding
      if (step === 1) {
        if (!companyName || !businessType || !ownerName || !countryCode || !phoneNumber) {
          toast({
            title: "Missing Information",
            description: "Please fill in all required fields.",
            variant: "destructive"
          });
          return;
        }
        
        // Create company
        setLoading(true);
        const result = await onboardingService.createCompany(user!.id, {
          name: companyName,
          business_type: businessType,
          employee_count: "", // Will be updated in step 3
          owner_name: ownerName,
          whatsapp: `${countryCode}${phoneNumber}`
        });
        
        if (result.success) {
          setCompanyId(result.companyId || null);
          setStep(step + 1);
        } else {
          toast({
            title: "Error",
            description: result.error,
            variant: "destructive"
          });
        }
        setLoading(false);
      } else if (step === 3) {
        if (!employeeName || !employeeSalary || !employeeCount) {
          toast({
            title: "Missing Information",
            description: "Please fill in all required fields.",
            variant: "destructive"
          });
          return;
        }
        setStep(step + 1);
      } else {
        setStep(step + 1);
      }
    }
  };

  const prev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      // Check if file is PDF only
      if (file.type === 'application/pdf') {
        setTradeLicenseDoc(file);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF file only.",
          variant: "destructive"
        });
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleCompleteOnboarding = async () => {
    if (!user || !companyId) return;
    
    setLoading(true);
    
    // Update compliance info
    const complianceResult = await onboardingService.updateComplianceInfo(companyId, {
      trade_license_expiry: tradeLicenseExpiry || undefined,
      visa_count: visaCount || undefined
    });
    
    if (!complianceResult.success) {
      toast({
        title: "Error",
        description: complianceResult.error,
        variant: "destructive"
      });
      setLoading(false);
      return;
    }
    
    // Add first employee if provided
    if (employeeName && employeeSalary) {
      const employeeResult = await onboardingService.addFirstEmployee(companyId, {
        name: employeeName,
        salary: employeeSalary
      });
      
      if (!employeeResult.success) {
        toast({
          title: "Error",
          description: employeeResult.error,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
    }
    
    // Upload documents if provided
    if (tradeLicenseDoc) {
      // For now, just store the file name. In production, you'd upload to storage service
      const docResult = await onboardingService.uploadDocuments(companyId, {
        trade_license_path: tradeLicenseDoc.name
      });
      
      if (!docResult.success) {
        toast({
          title: "Error",
          description: docResult.error,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
    }
    
    // Update company with employee count before completing onboarding
    if (employeeCount && companyId) {
      const updateResult = await onboardingService.updateCompanyInfo(companyId, {
        employee_count: employeeCount
      });
      
      if (!updateResult.success) {
        toast({
          title: "Error",
          description: updateResult.error,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
    }
    
    // Complete onboarding
    try {
      await completeOnboarding(user.id);
      
      toast({
        title: "Welcome!",
        description: "Your account is ready. Redirecting to dashboard...",
      });
      
      // Navigation will be handled by auth state change
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding",
        variant: "destructive"
      });
    }
    
    setLoading(false);
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
                <Label>Company Name *</Label>
                <Input 
                  placeholder="Acme Corp" 
                  value={companyName} 
                  disabled={true} // Always disabled since it's prefilled from signup
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Owner/Manager Name *</Label>
                <Input 
                  placeholder="John Doe" 
                  value={ownerName} 
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isValidAlphabeticInput(value)) {
                      setOwnerName(validateAlphabeticText(value));
                    }
                  }} 
                  disabled={loading} 
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp Contact Number *</Label>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode} disabled={loading}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Code" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+971">+971 UAE</SelectItem>
                      <SelectItem value="+966">+966 KSA</SelectItem>
                      <SelectItem value="+965">+965 Kuwait</SelectItem>
                      <SelectItem value="+973">+973 Bahrain</SelectItem>
                      <SelectItem value="+974">+974 Qatar</SelectItem>
                      <SelectItem value="+968">+968 Oman</SelectItem>
                      <SelectItem value="+20">+20 Egypt</SelectItem>
                      <SelectItem value="+91">+91 India</SelectItem>
                      <SelectItem value="+1">+1 USA</SelectItem>
                      <SelectItem value="+44">+44 UK</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    placeholder="50 123 4567" 
                    value={phoneNumber} 
                    onChange={(e) => {
                      const value = e.target.value;
                      if (isValidPhoneNumber(value)) {
                        setPhoneNumber(value);
                      }
                    }} 
                    disabled={loading} 
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Business Type *</Label>
                <Select value={businessType} onValueChange={setBusinessType} disabled={loading}>
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
                <Input 
                  type="date" 
                  value={tradeLicenseExpiry} 
                  onChange={(e) => setTradeLicenseExpiry(e.target.value)} 
                  disabled={loading}
                  min={getMinDate()}
                />
              </div>
              <div className="space-y-2">
                <Label>Number of Visas (optional)</Label>
                <Input 
                  placeholder="e.g., 5" 
                  value={visaCount} 
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isValidNumericInput(value)) {
                      setVisaCount(value);
                    }
                  }} 
                  disabled={loading} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="animate-fade-in">
            <h2 className="font-heading text-xl font-semibold text-foreground">Employees</h2>
            <p className="mt-1 text-sm text-muted-foreground">Add your first employee and company size.</p>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Employee Name *</Label>
                <Input 
                  placeholder="Employee name" 
                  value={employeeName} 
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isValidAlphabeticInput(value)) {
                      setEmployeeName(validateAlphabeticText(value));
                    }
                  }} 
                  disabled={loading} 
                />
              </div>
              <div className="space-y-2">
                <Label>Salary *</Label>
                <Input 
                  placeholder="e.g., 5000" 
                  value={employeeSalary} 
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isValidNumericInput(value)) {
                      setEmployeeSalary(value);
                    }
                  }} 
                  disabled={loading} 
                />
              </div>
              <div className="space-y-2">
                <Label>Employee Count *</Label>
                <Select value={employeeCount} onValueChange={setEmployeeCount} disabled={loading}>
                  <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-5">1-5</SelectItem>
                    <SelectItem value="5-15">5-15</SelectItem>
                    <SelectItem value="15-50">15-50</SelectItem>
                    <SelectItem value="50+">50+</SelectItem>
                  </SelectContent>
                </Select>
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
              <div 
                className={`rounded-md border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
                  isDragging 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
                {tradeLicenseDoc ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{tradeLicenseDoc.name}</p>
                    <p className="text-xs text-muted-foreground">Click or drag to replace</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Drag & drop your trade license here, or click to browse</p>
                    <Button variant="outline" size="sm" type="button" disabled={loading}>Browse Files</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          {step > 1 ? (
            <Button variant="outline" onClick={prev} disabled={loading}>Back</Button>
          ) : <div />}
          {step < totalSteps ? (
            <Button onClick={next} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
          ) : (
            <Button onClick={handleCompleteOnboarding} disabled={isCompletingOnboarding || loading}>
              {(isCompletingOnboarding || loading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
