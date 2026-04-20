import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Search, Edit, Trash2, UserPlus, Users, Eye, EyeOff } from "lucide-react";
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
  CREATE_USER_PASSWORD_MAX_LENGTH,
  CREATE_USER_PASSWORD_MIN_LENGTH,
  type CreateUserData,
  type User,
} from "@/modules/user-management/services/userManagementService";
import { validateAlphabeticText, isValidAlphabeticInput } from "@/modules/auth/services/formValidation";
import { SimplePagination } from "@/components/Pagination";
import { useServerPagination } from "@/hooks/useServerPagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useDeferredValue } from "react";
import {
  useManagedUsers,
  useCreateManagedUser,
  useUpdateManagedUser,
  useDeleteManagedUser,
} from "@/modules/user-management/hooks/useUserManagementQuery";

// Constants
const USER_ROLES = [
  { value: 'pro', label: 'Pro', description: 'Can manage multiple businesses' },
  { value: 'employee', label: 'Employee', description: 'Basic access to business data' }
];

const ROLE_BADGE_VARIANTS = {
  owner: 'default',
  pro: 'secondary',
  employee: 'outline'
} as const;

// Helper functions
const getRoleBadgeVariant = (role: string) => ROLE_BADGE_VARIANTS[role as keyof typeof ROLE_BADGE_VARIANTS] || 'outline';

// Validation functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 100;
};

const validateCreateUserForm = (
  data: CreateUserData,
  confirmPassword: string
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.full_name.trim()) {
    errors.full_name = 'Full name is required';
  } else if (!validateName(data.full_name)) {
    errors.full_name = 'Full name must be between 2 and 100 characters';
  }

  if (!['pro', 'employee'].includes(data.role)) {
    errors.role = 'Please select a valid role';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  } else if (data.password.length < CREATE_USER_PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${CREATE_USER_PASSWORD_MIN_LENGTH} characters`;
  } else if (data.password.length > CREATE_USER_PASSWORD_MAX_LENGTH) {
    errors.password = `Password must be at most ${CREATE_USER_PASSWORD_MAX_LENGTH} characters`;
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm the password';
  } else if (confirmPassword !== data.password) {
    errors.confirmPassword = 'Passwords do not match';
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

  const pagination = useServerPagination({
    pageSize: DEFAULT_PAGE_SIZE,
    resetKey: `${roleFilter}|${deferredSearch}`,
  });

  const {
    data: usersData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useManagedUsers(authUserId, {
    ...pagination.queryParams,
    search: deferredSearch,
    role: roleFilter === 'all' ? undefined : roleFilter,
  });

  const users = usersData?.users ?? [];
  const total = usersData?.total ?? 0;

  const createUser = useCreateManagedUser(authUserId);
  const updateUser = useUpdateManagedUser(authUserId);
  const deleteUser = useDeleteManagedUser(authUserId);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'pro' | 'employee' | null>(null);
  const [isRoleSelectionStep, setIsRoleSelectionStep] = useState(true);
  
  // Form state
  const [newUser, setNewUser] = useState<CreateUserData>({
    email: '',
    role: 'employee',
    full_name: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // User actions state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: ''
  });

  const mutating =
    createUser.isPending ||
    updateUser.isPending ||
    deleteUser.isPending;

  // Create new user
  // Handle role selection
  const handleRoleSelect = (role: 'pro' | 'employee') => {
    setSelectedRole(role);
    setIsRoleSelectionStep(false);
    setNewUser(prev => ({ ...prev, role }));
  };

  // Reset modal state
  const resetModalState = () => {
    setSelectedRole(null);
    setIsRoleSelectionStep(true);
    setNewUser({ email: '', role: 'employee', full_name: '', password: '' });
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setFormErrors({});
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateCreateUserForm(newUser, confirmPassword);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    
    setFormErrors({});

    createUser.mutate(newUser, {
      onSuccess: () => {
        resetModalState();
        setIsCreateDialogOpen(false);
      },
    });
  };

  // Edit user
  const handleEditUser = (userRow: User) => {
    setEditingUser(userRow);
    setEditForm({
      full_name: userRow.full_name || ''
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
        displayName: editingUser.full_name || editingUser.email,
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
    if (!window.confirm(`Are you sure you want to delete ${userRow.full_name || userRow.email}? This action cannot be undone.`)) {
      return;
    }

    deleteUser.mutate({
      userId: userRow.id,
      label: userRow.full_name || userRow.email,
    });
  };

  
  // Type-safe wrapper for setRoleFilter
  const handleRoleFilterChange = (value: string) => {
    if (value === "all" || value === "owner" || value === "pro" || value === "employee") {
      setRoleFilter(value);
    }
  };


  const roleFilters: { label: string; value: "all" | "owner" | "pro" | "employee" }[] = [
    { label: "All Roles", value: "all" as const },
    { label: "Owner", value: "owner" as const },
    { label: "Pro", value: "pro" as const },
    { label: "Employee", value: "employee" as const },
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

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">User Management ({loadErrorMessage ? '—' : total})</h1>
            <p className="text-muted-foreground">
              Manage PRO consultants and employees for your business
            </p>
          </div>
          
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                resetModalState();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button disabled={!!loadErrorMessage || mutating}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              {isRoleSelectionStep ? (
                // Role Selection Step
                <>
                  <DialogHeader className="pb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserPlus className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <DialogTitle className="text-xl font-semibold">Create New User</DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1">Select the role for the new team member</p>
                      </div>
                    </div>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {USER_ROLES.map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => handleRoleSelect(role.value as 'pro' | 'employee')}
                        className="w-full text-left p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                              {role.label}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {role.description}
                            </div>
                          </div>
                          <div className="text-muted-foreground group-hover:text-primary transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="transition-all duration-200 hover:bg-accent/50"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                // Form Step (only for Employee for now)
                <>
                  <DialogHeader className="pb-6">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsRoleSelectionStep(true)}
                        className="w-8 h-8 rounded-full hover:bg-accent/50 flex items-center justify-center transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserPlus className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <DialogTitle className="text-xl font-semibold">Create New {selectedRole === 'pro' ? 'Pro' : 'Employee'}</DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Add a new {selectedRole === 'pro' ? 'Pro consultant' : 'Employee'} to your business
                        </p>
                      </div>
                    </div>
                  </DialogHeader>
                  
                  {selectedRole === 'employee' ? (
                    <form onSubmit={handleCreateUser} className="space-y-6">
                      {/* Name and Email */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName" className="text-sm font-medium flex items-center gap-1">
                            Full Name <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="fullName"
                              placeholder="e.g., John Smith"
                              value={newUser.full_name}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (isValidAlphabeticInput(value)) {
                                  setNewUser({...newUser, full_name: validateAlphabeticText(value)});
                                  if (formErrors.full_name) {
                                    setFormErrors({...formErrors, full_name: ''});
                                  }
                                }
                              }}
                              className={`transition-all duration-200 ${formErrors.full_name ? 'border-destructive focus:ring-destructive/20' : 'focus:ring-primary/20'}`}
                              required
                            />
                          </div>
                          {formErrors.full_name && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                              <span className="w-1 h-1 bg-destructive rounded-full"></span>
                              {formErrors.full_name}
                            </p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1">
                            Email Address <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="email"
                              type="email"
                              placeholder="john@company.com"
                              value={newUser.email}
                              onChange={(e) => {
                                setNewUser({...newUser, email: e.target.value});
                                if (formErrors.email) {
                                  setFormErrors({...formErrors, email: ''});
                                }
                              }}
                              className={`transition-all duration-200 ${formErrors.email ? 'border-destructive focus:ring-destructive/20' : 'focus:ring-primary/20'}`}
                              required
                            />
                          </div>
                          {formErrors.email && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                              <span className="w-1 h-1 bg-destructive rounded-full"></span>
                              {formErrors.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Password and Confirm Password */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="newUserPassword" className="text-sm font-medium flex items-center gap-1">
                            Password <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="newUserPassword"
                              type={showNewPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              placeholder="Enter a secure password"
                              value={newUser.password}
                              onChange={(e) => {
                                setNewUser({ ...newUser, password: e.target.value });
                                if (formErrors.password) {
                                  setFormErrors({ ...formErrors, password: '' });
                                }
                              }}
                              className={`pr-12 transition-all duration-200 ${formErrors.password ? 'border-destructive focus:ring-destructive/20' : 'focus:ring-primary/20'}`}
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                              onClick={() => setShowNewPassword((s) => !s)}
                              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                            >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {formErrors.password && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                              <span className="w-1 h-1 bg-destructive rounded-full"></span>
                              {formErrors.password}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmNewUserPassword" className="text-sm font-medium flex items-center gap-1">
                            Confirm Password <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="confirmNewUserPassword"
                              type={showConfirmPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              placeholder="Re-enter the password"
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (formErrors.confirmPassword) {
                                  setFormErrors({ ...formErrors, confirmPassword: '' });
                                }
                              }}
                              className={`pr-12 transition-all duration-200 ${formErrors.confirmPassword ? 'border-destructive focus:ring-destructive/20' : 'focus:ring-primary/20'}`}
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                              onClick={() => setShowConfirmPassword((s) => !s)}
                              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {formErrors.confirmPassword && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                              <span className="w-1 h-1 bg-destructive rounded-full"></span>
                              {formErrors.confirmPassword}
                            </p>
                          )}
                        </div>
                      </div>
                      
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
                            disabled={createUser.isPending}
                            className="transition-all duration-200 hover:shadow-lg"
                          >
                            {createUser.isPending ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                Creating...
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Create Employee
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    // Pro placeholder - you can add logic here later
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <UserPlus className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Pro User Creation</h3>
                      <p className="text-muted-foreground mb-6">
                        Pro user creation logic will be implemented here.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsRoleSelectionStep(true)}
                          className="transition-all duration-200 hover:bg-accent/50"
                        >
                          Back
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => setIsCreateDialogOpen(false)}
                          className="transition-all duration-200 hover:bg-accent/50"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search users..." 
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
                      <h3 className="text-lg font-semibold mb-2">No users found</h3>
                      <p className="text-muted-foreground">
                        {searchTerm ? 'Try adjusting your search terms.' : 'Create your first user to get started.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  users.map((userRow) => (
                    <tr key={userRow.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-foreground w-[30%]">
                        {userRow.full_name || 'No name'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground w-[35%]">
                        {userRow.email}
                      </td>
                      <td className="px-4 py-3 w-[20%]">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          userRow.role === 'pro' ? 'bg-primary/10 text-primary' :
                          userRow.role === 'employee' ? 'bg-warning/10 text-warning' :
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

        <SimplePagination
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
          />

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
