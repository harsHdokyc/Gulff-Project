import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/modules/auth/components/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2, User, Users, Phone, Calendar, FileText, Shield, CreditCard, TrendingUp } from "lucide-react";
import { validateAlphabeticText, isValidAlphabeticInput } from "@/modules/auth/services/formValidation";

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
  const { t } = useTranslation();
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
      // Use the get_user_company function to get the company ID efficiently
      const { data: companyId, error: idError } = await supabase
        .rpc('get_user_company');

      if (idError) throw idError;
      if (!companyId) {
        // User doesn't have a company, show onboarding message
        setCompanyData(null);
        toast({
          title: t('errors.general'),
          description: t('settings.noCompanyDataDesc'),
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .limit(1);

      if (error) throw error;
      
      // Take the first company record if multiple exist
      const company = data && data.length > 0 ? data[0] : null;
      setCompanyData(company);
      
      if (!company) {
        toast({
          title: t('errors.general'),
          description: t('settings.noCompanyDataDesc'),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: t('errors.general'),
        description: t('errors.networkError'),
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
        title: t('common.save'),
        description: "Company settings updated successfully"
      });
    } catch (error) {
      toast({
        title: t('errors.general'),
        description: t('errors.networkError'),
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
      <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">{t('settings.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('settings.subtitle')}</p>
        </div>

        {/* Modern Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "company" | "billing")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {t('settings.companySettings')}
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              {t('settings.billing')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-6 mt-6">
            {companyData ? (
              <>
                {/* Company Information Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      {t('settings.companyInformation')}
                    </CardTitle>
                    <CardDescription>
                      {t('settings.companyInformationDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="company-name" className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {t('settings.companyName')}
                        </Label>
                        <Input 
                          id="company-name"
                          value={companyData.name}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (isValidAlphabeticInput(value)) {
                              setCompanyData({...companyData, name: validateAlphabeticText(value)});
                            }
                          }}
                          placeholder="Enter company name"
                          className="transition-all focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="business-type" className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          {t('settings.businessType')}
                        </Label>
                        <Input 
                          id="business-type"
                          value={companyData.business_type}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (isValidAlphabeticInput(value)) {
                              setCompanyData({...companyData, business_type: validateAlphabeticText(value)});
                            }
                          }}
                          placeholder="Enter business type"
                          className="transition-all focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="employee-count" className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {t('settings.employeeCount')}
                        </Label>
                        <Input 
                          id="employee-count"
                          value={companyData.employee_count}
                          onChange={(e) => setCompanyData({...companyData, employee_count: e.target.value})}
                          placeholder="Enter employee count range"
                          className="transition-all focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="owner-name" className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {t('settings.ownerName')}
                        </Label>
                        <Input 
                          id="owner-name"
                          value={companyData.owner_name}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (isValidAlphabeticInput(value)) {
                              setCompanyData({...companyData, owner_name: validateAlphabeticText(value)});
                            }
                          }}
                          placeholder="Enter owner name"
                          className="transition-all focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact & Compliance Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5 text-primary" />
                      {t('settings.contactCompliance')}
                    </CardTitle>
                    <CardDescription>
                      {t('settings.contactComplianceDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp" className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          {t('settings.whatsappNumber')}
                        </Label>
                        <Input 
                          id="whatsapp"
                          value={companyData.whatsapp}
                          onChange={(e) => setCompanyData({...companyData, whatsapp: e.target.value})}
                          placeholder="Enter WhatsApp number"
                          className="transition-all focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="visa-count" className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-muted-foreground" />
                          {t('settings.visaCount')}
                        </Label>
                        <Input 
                          id="visa-count"
                          type="number"
                          value={companyData.visa_count || ''}
                          onChange={(e) => setCompanyData({...companyData, visa_count: parseInt(e.target.value) || 0})}
                          placeholder="Enter visa count"
                          className="transition-all focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="license-expiry" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {t('settings.tradeLicenseExpiry')}
                      </Label>
                      <Input 
                        id="license-expiry"
                        type="date"
                        value={companyData.trade_license_expiry || ''}
                        onChange={(e) => setCompanyData({...companyData, trade_license_expiry: e.target.value})}
                        className="transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t('settings.lastUpdated')}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date().toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                      <Button onClick={handleSaveCompany} disabled={saving} size="lg">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('settings.saveChanges')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('settings.noCompanyData')}</h3>
                  <p className="text-muted-foreground text-center mb-6 max-w-md">
                    {t('settings.noCompanyDataDesc')}
                  </p>
                  <Button onClick={() => window.location.href = '/onboarding'} size="lg">
                    {t('settings.completeOnboarding')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  {t('settings.billingOverview')}
                </CardTitle>
                <CardDescription>
                  {t('settings.billingOverviewDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">{t('settings.currentPlan')}</span>
                    </div>
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      {t('settings.free')}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">{t('settings.taskLimit')}</span>
                    <p className="text-2xl font-bold">50</p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">{t('settings.tasksUsed')}</span>
                    <p className="text-2xl font-bold text-primary">24</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{t('settings.monthlyUsage')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="w-1/2 h-full bg-primary rounded-full"></div>
                      </div>
                      <span className="text-sm text-muted-foreground">48%</span>
                    </div>
                  </div>
                  
                  <Button className="w-full" size="lg">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    {t('settings.upgradePlan')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
