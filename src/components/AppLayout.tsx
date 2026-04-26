import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Shield, Users, FileText, Settings, UserPlus, Menu, Sun, Moon, LogOut, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/NotificationCenter";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/modules/auth/components/AuthContext";
import { useCompanyName, useCurrentUserRole, useProCompanies } from "@/hooks/useCompanyQuery";
import { useProAssociationRequests } from "@/modules/user-management/hooks/useUserManagementQuery";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Compliance", icon: Shield, path: "/compliance" },
  { label: "Employees", icon: Users, path: "/employees" },
  { label: "Documents", icon: FileText, path: "/documents" },
  {
    label: "User Management",
    icon: UserPlus,
    path: "/user-management",
    hideForEmployee: true,
  },
  {
    label: "Association Requests",
    icon: Inbox,
    path: "/association-requests",
    onlyForPro: true,
  },
  { label: "Settings", icon: Settings, path: "/settings" },
] as const;

const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isDark, toggle: toggleTheme } = useTheme();
  const { user, signOut, isSigningOut } = useAuthContext();
  const { data: companyName, isLoading: isCompanyLoading } = useCompanyName(user?.id);
  const { data: profileRole, isLoading: isRoleLoading } = useCurrentUserRole(user?.id);
  const { data: proCompanies, isLoading: isProCompaniesLoading } = useProCompanies(user?.id);
  const { data: associationRequests = [] } = useProAssociationRequests(user?.id);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Calculate pending association requests for red dot indicator
  const pendingAssociationRequests = associationRequests.filter((request) => request.status === "pending").length;

  useEffect(() => {
    if (profileRole !== "pro") return;
    if (!proCompanies || proCompanies.length === 0) return;
    if (selectedCompanyId) return;
    setSelectedCompanyId(proCompanies[0].id);
  }, [profileRole, proCompanies, selectedCompanyId]);

  const visibleNavItems = navItems.filter((item) => {
    if ("onlyForPro" in item && item.onlyForPro) {
      if (isRoleLoading) return false;
      return profileRole === "pro";
    }
    if (!("hideForEmployee" in item) || !item.hideForEmployee) return true;
    if (isRoleLoading) return false;
    // Hide User Management from both employees and pros - only owners can see it
    return profileRole === "owner";
  });

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sticky Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-56" : "w-0 md:w-14"} flex-shrink-0 border-r border-border bg-card transition-all duration-200 overflow-hidden sticky top-0 h-screen`}
      >
        <div className="h-16 flex items-center px-4 border-b border-border">
          <span className="font-heading text-sm font-semibold text-foreground">
            {sidebarOpen ? "ComplianceHQ" : "CH"}
          </span>
        </div>
        <nav className="p-2 space-y-0.5">
          {visibleNavItems.map((item) => {
            const active = location.pathname === item.path;
            const hasPendingRequests = item.path === "/association-requests" && pendingAssociationRequests > 0;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors relative ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
                {hasPendingRequests && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 bg-card sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            {profileRole === "pro" ? (
              <div className="hidden md:block">
                {isProCompaniesLoading ? (
                  <span className="text-sm text-muted-foreground">Loading...</span>
                ) : (
                  <Select
                    value={selectedCompanyId}
                    onValueChange={setSelectedCompanyId}
                    disabled={!proCompanies || proCompanies.length === 0}
                  >
                    <SelectTrigger className="text-sm text-muted-foreground w-48">
                      <SelectValue placeholder={proCompanies && proCompanies.length > 0 ? "Select Company" : "No Companies Linked"} />
                    </SelectTrigger>
                    <SelectContent>
                      {proCompanies && proCompanies.length > 0 ? (
                        proCompanies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-company" disabled>
                          No companies linked
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              // Business owner: Show single company name
              <span className="text-sm text-muted-foreground hidden md:block">
                {isCompanyLoading ? "Loading..." : companyName || "No Company"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button 
              onClick={() => signOut()}
              disabled={isSigningOut}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
