import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { validateAlphabeticText, isValidAlphabeticInput } from "@/lib/formValidation";

interface CompanyData {
  id: string;
  name: string;
  business_type: string;
  employee_count: string;
  owner_name: string;
  whatsapp: string;
  trade_license_expiry?: string;
  visa_count?: number;
}

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<"company" | "billing">("company");
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthContext();

  // Fetch company data on component mount
  useEffect(() => {
    if (user) {
      fetchCompanyData();
    }
  }, [user]);

  const fetchCompanyData = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id)
        .limit(1);

      if (error) throw error;
      
      // Take the first company record if multiple exist
      const company = data && data.length > 0 ? data[0] : null;
      setCompanyData(company);
      
      if (!company) {
        toast({
          title: "No Company Data",
          description: "Please complete onboarding first",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load company data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!companyData) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: companyData.name,
          business_type: companyData.business_type,
          employee_count: companyData.employee_count,
          owner_name: companyData.owner_name,
          whatsapp: companyData.whatsapp,
          trade_license_expiry: companyData.trade_license_expiry,
          visa_count: companyData.visa_count
        })
        .eq('id', companyData.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Company settings updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update company settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto animate-fade-in flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto animate-fade-in">
        <h1 className="font-heading text-2xl font-semibold text-foreground mb-6">Settings</h1>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6">
          {(["company", "billing"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-sm capitalize transition-colors ${
                activeTab === tab ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {tab === "company" ? "Company Settings" : "Billing"}
            </button>
          ))}
        </div>

        {activeTab === "company" && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            {companyData ? (
              <>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input 
                    value={companyData.name}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (isValidAlphabeticInput(value)) {
                        setCompanyData({...companyData, name: validateAlphabeticText(value)});
                      }
                    }}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business Type</Label>
                  <Input 
                    value={companyData.business_type}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (isValidAlphabeticInput(value)) {
                        setCompanyData({...companyData, business_type: validateAlphabeticText(value)});
                      }
                    }}
                    placeholder="Enter business type"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employee Count</Label>
                  <Input 
                    value={companyData.employee_count}
                    onChange={(e) => setCompanyData({...companyData, employee_count: e.target.value})}
                    placeholder="Enter employee count range"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Owner Name</Label>
                  <Input 
                    value={companyData.owner_name}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (isValidAlphabeticInput(value)) {
                        setCompanyData({...companyData, owner_name: validateAlphabeticText(value)});
                      }
                    }}
                    placeholder="Enter owner name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Number</Label>
                  <Input 
                    value={companyData.whatsapp}
                    onChange={(e) => setCompanyData({...companyData, whatsapp: e.target.value})}
                    placeholder="Enter WhatsApp number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trade License Expiry</Label>
                  <Input 
                    type="date"
                    value={companyData.trade_license_expiry || ''}
                    onChange={(e) => setCompanyData({...companyData, trade_license_expiry: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Visa Count</Label>
                  <Input 
                    type="number"
                    value={companyData.visa_count || ''}
                    onChange={(e) => setCompanyData({...companyData, visa_count: parseInt(e.target.value) || 0})}
                    placeholder="Enter visa count"
                  />
                </div>
                <Button onClick={handleSaveCompany} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No company data found. Please complete the onboarding process first.</p>
                <Button className="mt-4" onClick={() => window.location.href = '/onboarding'}>
                  Complete Onboarding
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "billing" && (
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Current Plan</span>
                <span className="text-sm font-medium text-foreground">Free</span>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Task Limit</span>
                <span className="text-sm font-medium text-foreground">50</span>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Tasks Used</span>
                <span className="text-sm font-medium text-foreground">24</span>
              </div>
              <Button className="w-full mt-2">Upgrade Plan</Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
