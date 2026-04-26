import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Search, Edit, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthContext } from "@/modules/auth/components/AuthContext";
import {
  type User,
} from "@/modules/user-management/services/userManagementService";
// import { SimplePagination } from "@/components/Pagination";
// import { useServerPagination } from "@/hooks/useServerPagination";
// import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useDeferredValue } from "react";
import { toast } from "@/hooks/use-toast";
import {
  useManagedUsers,
  useUpdateManagedUser,
  useDeleteManagedUser,
  useProSearch,
  useCreateProAssociationRequest,
  useBusinessAssociationRequests,
} from "@/modules/user-management/hooks/useUserManagementQuery";
import {
  type ProSearchResult,
  type CreateProAssociationRequest,
} from "@/modules/user-management/services/userManagementService";


const ROLE_BADGE_VARIANTS = {
  owner: 'default',
  pro: 'secondary'
} as const;

// Helper functions
const getRoleBadgeVariant = (role: string) => ROLE_BADGE_VARIANTS[role as keyof typeof ROLE_BADGE_VARIANTS] || 'outline';

// Helper function to get display name
const getDisplayName = (userRow: User, currentUser?: any) => {
  // If this is the current user (owner), try to get display_name from auth metadata
  if (userRow.id === currentUser?.id) {
    const displayName = currentUser?.user_metadata?.display_name || 
                       currentUser?.app_metadata?.display_name ||
                       currentUser?.user_metadata?.name ||
                       currentUser?.app_metadata?.name;
    if (displayName) {
      return displayName;
    }
  }
  
  // Fall back to display_name from users table or email
  return userRow.display_name || userRow.email || 'No name';
};

// Validation functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 100;
};

const validateProAssociationForm = (
  proEmail: string
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!proEmail.trim()) {
    errors.proEmail = 'PRO email is required';
  } else if (!validateEmail(proEmail)) {
    errors.proEmail = 'Please enter a valid email address';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Main component
const UserManagementPage = () => {
  const { user } = useAuthContext();
  const authUserId = user?.id;

  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [roleFilter, setRoleFilter] = useState('all');

  // Pagination disabled: user management only ever shows a couple of rows (owner + PRO).
  // const pagination = useServerPagination({
  //   pageSize: DEFAULT_PAGE_SIZE,
  //   resetKey: `${roleFilter}|${deferredSearch}`,
  // });

  const {
    data: usersData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useManagedUsers(authUserId, {
    // ...pagination.queryParams,
    search: deferredSearch,
    role: roleFilter === 'all' ? undefined : roleFilter,
  });

  const users = usersData?.users ?? [];

  const { data: associationRequests } = useBusinessAssociationRequests(authUserId);

  // Add associated PRO users to the users table
  const associatedProUsers = associationRequests
    ?.filter(req => req.status === 'accepted')
    ?.map(req => ({
      id: req.pro_user_id,
      email: req.pro_email || 'PRO User',
      role: 'pro' as const,
      full_name: req.pro_name || null,
      company_id: req.business_id,
      created_at: req.created_at,
      updated_at: req.updated_at,
      onboarding_completed: true,
      onboarding_completed_at: null,
      status: 'active' as const,
      pro_id: null,
    })) || [];

  // Combine owner users with associated PRO users
  const allUsers = [...users, ...associatedProUsers];

  const total = allUsers.length;

  const updateUser = useUpdateManagedUser(authUserId);
  const deleteUser = useDeleteManagedUser(authUserId);
  const createProAssociation = useCreateProAssociationRequest(authUserId);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // PRO Association Form state
  const [proName, setProName] = useState('');
  const [proEmail, setProEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPro, setSelectedPro] = useState<ProSearchResult | null>(null);
    const [showProSearchResults, setShowProSearchResults] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // PRO search with debouncing
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const {
    data: proSearchResults,
    isLoading: isProSearchLoading,
  } = useProSearch(deferredSearchQuery);

  // User actions state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: ''
  });

  const mutating =
    updateUser.isPending ||
    deleteUser.isPending ||
    createProAssociation.isPending;

  // Check if owner already has a PRO assigned
  const hasExistingPro = allUsers.some(user => user.role === 'pro');

  // Reset modal state
  const resetModalState = () => {
    setProName('');
    setProEmail('');
    setSearchQuery('');
    setSelectedPro(null);
    setShowProSearchResults(false);
    setFormErrors({});
  };

  const handleProAssociation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user already has a PRO
    if (hasExistingPro) {
      toast({
        title: 'PRO Limit Reached',
        description: 'You already have a PRO assigned. You cannot add more than one PRO.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!selectedPro) {
      setFormErrors({ proEmail: 'Please select a PRO from the search results' });
      return;
    }

    const validation = validateProAssociationForm(selectedPro.email);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    
    setFormErrors({});

    try {
      await createProAssociation.mutateAsync({
        pro_user_id: selectedPro.id,
      });
      resetModalState();
      setIsCreateDialogOpen(false);
    } catch {
      // Error toast is handled by the mutation hook.
    }
  };

  // Handle PRO selection from search results
  const handleProSelect = (pro: ProSearchResult) => {
    setSelectedPro(pro);
    setProName(pro.full_name || '');
    setProEmail(pro.email);
    setSearchQuery('');
    setShowProSearchResults(false);
    setFormErrors({});
  };

  // Edit user
  const handleEditUser = (userRow: User) => {
    setEditingUser(userRow);
    setEditForm({
      full_name: userRow.display_name || userRow.email || ''
    });
    setIsEditDialogOpen(true);
  };

  // Update user
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser || !editForm.full_name.trim()) {
      return;
    }

    updateUser.mutate(
      {
        userId: editingUser.id,
        full_name: editForm.full_name.trim(),
        displayName: editForm.full_name.trim(),
      },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditingUser(null);
        },
      }
    );
  };

  // Delete user
  const handleDeleteUser = (userRow: User) => {
    const displayName = getDisplayName(userRow, user);
    if (!window.confirm(`Are you sure you want to delete ${displayName}? This action cannot be undone.`)) {
      return;
    }

    deleteUser.mutate({
      userId: userRow.id,
      label: displayName,
    });
  };

  
  // Type-safe wrapper for setRoleFilter
  const handleRoleFilterChange = (value: string) => {
    if (value === "all" || value === "owner" || value === "pro") {
      setRoleFilter(value);
    }
  };


  const roleFilters: { label: string; value: "all" | "owner" | "pro" }[] = [
    { label: "All Roles", value: "all" as const },
    { label: "Owner", value: "owner" as const },
    { label: "Pro", value: "pro" as const },
  ];

  // Security check - don't render if not logged in
  if (!user) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
                <p className="text-muted-foreground">
                  Please sign in to access user management.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const loadErrorMessage = isError && error instanceof Error ? error.message : null;

  // Get button state based on PRO assignment and system status
  const buttonState = {
    disabled: !!loadErrorMessage || mutating || hasExistingPro,
    tooltip: hasExistingPro 
      ? 'You already have a PRO assigned. You cannot add a new one.'
      : (loadErrorMessage || mutating ? 'System busy or loading data' : 'Request association with a PRO consultant')
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">PRO Management ({loadErrorMessage ? '—' : total})</h1>
            <p className="text-muted-foreground">
              Manage PRO associations and requests for your business
            </p>
          </div>
          
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              if (open && hasExistingPro) {
                toast({
                  title: 'PRO Limit Reached',
                  description: 'You already have a PRO assigned. You cannot add more than one PRO.',
                  variant: 'destructive',
                });
                return;
              }
              setIsCreateDialogOpen(open);
              if (!open) {
                resetModalState();
              }
            }}
          >
            <DialogTrigger asChild>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-block">
                        <Button disabled={buttonState.disabled}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Request PRO Association
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{buttonState.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              {/* PRO Creation Form */}
              <>
                <DialogHeader className="pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-semibold">Request PRO Association</DialogTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Find and request association with an existing PRO consultant
                      </p>
                    </div>
                  </div>
                </DialogHeader>
                
                <form onSubmit={handleProAssociation} className="space-y-6">
                  {/* PRO Search */}
                  <div className="space-y-2">
                    <Label htmlFor="proSearch" className="text-sm font-medium flex items-center gap-1">
                      Search for PRO <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="proSearch"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowProSearchResults(true);
                          if (formErrors.proEmail) {
                            setFormErrors({ ...formErrors, proEmail: '' });
                          }
                        }}
                        className={`pl-9 transition-all duration-200 ${formErrors.proEmail ? 'border-destructive focus:ring-destructive/20' : 'focus:ring-primary/20'}`}
                      />
                      {isProSearchLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Search Results */}
                    {showProSearchResults && searchQuery.length >= 2 && (
                      <div className="border rounded-md bg-background shadow-sm max-h-48 overflow-y-auto">
                        {proSearchResults?.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground text-center">
                            No PROs found matching "{searchQuery}"
                          </div>
                        ) : (
                          proSearchResults?.map((pro) => (
                            <button
                              key={pro.id}
                              type="button"
                              onClick={() => handleProSelect(pro)}
                              className="w-full p-3 text-left hover:bg-accent/50 transition-colors border-b last:border-b-0"
                            >
                              <div className="font-medium text-sm">{pro.full_name || 'No name'}</div>
                              <div className="text-xs text-muted-foreground">{pro.email}</div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                    
                    {formErrors.proEmail && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <span className="w-1 h-1 bg-destructive rounded-full"></span>
                        {formErrors.proEmail}
                      </p>
                    )}
                  </div>

                  {/* Selected PRO Display */}
                  {selectedPro && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Selected PRO</Label>
                      <div className="p-3 bg-muted/50 rounded-md border">
                        <div className="font-medium text-sm">{selectedPro.full_name || 'No name'}</div>
                        <div className="text-xs text-muted-foreground">{selectedPro.email}</div>
                      </div>
                    </div>
                  )}

                                        
                  <div className="flex justify-end pt-4">
                    <div className="flex gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="transition-all duration-200 hover:bg-accent/50"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createProAssociation.isPending || !selectedPro}
                        className="transition-all duration-200 hover:shadow-lg"
                      >
                        {createProAssociation.isPending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Send Request
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
                </>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search PROs..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-9" 
              disabled={!!loadErrorMessage}
            />
          </div>
          <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {roleFilters.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Users List */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {isFetching && !isLoading && (
            <div className="px-4 py-2 border-b border-border bg-secondary/30 flex items-center justify-end">
              <span className="text-xs font-normal text-muted-foreground">Updating...</span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium w-[30%]">Name</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium w-[35%]">Email</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium w-[20%]">Role</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium w-[15%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadErrorMessage ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8">
                      <div className="text-center">
                        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm inline-block">
                          <p className="font-medium text-destructive">Could not load users</p>
                          <p className="mt-1 text-muted-foreground">{loadErrorMessage}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => refetch()}
                          >
                            Retry
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No PROs found</h3>
                      <p className="text-muted-foreground">
                        {searchTerm ? 'Try adjusting your search terms.' : 'Create your first PRO to get started.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  allUsers.map((userRow) => (
                    <tr key={userRow.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-foreground w-[30%]">
                        {getDisplayName(userRow, user)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground w-[35%]">
                        {userRow.email}
                      </td>
                      <td className="px-4 py-3 w-[20%]">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          userRow.role === 'pro' ? 'bg-primary/10 text-primary' :
                          'bg-success/10 text-success'
                        }`}>
                          {userRow.role.charAt(0).toUpperCase() + userRow.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right w-[15%]">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  onClick={() => handleEditUser(userRow)} 
                                  disabled={mutating}
                                  className={`p-1.5 rounded-md transition-colors ${
                                    mutating 
                                      ? "text-muted-foreground/50 cursor-not-allowed" 
                                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                  }`}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit user</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  onClick={() => handleDeleteUser(userRow)} 
                                  disabled={mutating || userRow.role === 'owner'}
                                  className={`p-1.5 rounded-md transition-colors ${
                                    mutating || userRow.role === 'owner'
                                      ? "text-muted-foreground/50 cursor-not-allowed" 
                                      : "text-muted-foreground hover:text-destructive hover:bg-accent"
                                  }`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete user</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* <SimplePagination
            pagination={{
              total,
              pageCount: Math.ceil(total / pagination.pageSize),
              rangeStart: total === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1,
              rangeEnd: Math.min((pagination.pageIndex + 1) * pagination.pageSize, total),
              canPrev: pagination.pageIndex > 0,
              canNext: (pagination.pageIndex + 1) * pagination.pageSize < total,
            }}
            onPageChange={pagination.setPageIndex}
            disabled={isFetching}
          /> */}

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <Label htmlFor="editFullName">Full Name</Label>
                <Input
                  id="editFullName"
                  placeholder="Enter full name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                  required
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={updateUser.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUser.isPending}>
                  {updateUser.isPending ? 'Updating...' : 'Update User'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default UserManagementPage;
