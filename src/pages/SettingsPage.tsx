import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<"company" | "billing">("company");

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
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input defaultValue="Acme Corp" />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input defaultValue="Technology" />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Number</Label>
              <Input defaultValue="+971 50 123 4567" />
            </div>
            <Button>Save Changes</Button>
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
