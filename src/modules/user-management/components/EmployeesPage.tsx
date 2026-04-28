import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { validateAlphabeticText, isValidAlphabeticInput } from "@/modules/auth/services/formValidation";
import { SimplePagination } from "@/components/Pagination";
import { useServerPagination } from "@/hooks/useServerPagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useAuthContext } from "@/modules/auth/components/AuthContext";
import {
  useEmployees,
  useEmployeesPage,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useExportEmployees,
  useImportEmployees,
} from "@/modules/user-management/hooks/useEmployeeQuery";
import { type Employee } from "@/modules/user-management/services/employeeService";
import { useDeferredValue } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { Download, Upload } from "lucide-react";


const emptyForm = { name: "", visaExpiry: "", emiratesIdExpiry: "" };

interface EmpFormProps {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  onSubmit: () => void;
  label: string;
  errors?: { name?: string; visaExpiry?: string; emiratesIdExpiry?: string };
  onFieldChange?: (field: string) => void;
  isSubmitting?: boolean;
}

const EmpForm = ({ form, setForm, onSubmit, label, errors = {}, onFieldChange, isSubmitting = false }: EmpFormProps) => (
  <div className="space-y-4 mt-2">
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        Employee Name <span className="text-destructive">*</span>
      </Label>
      <Input 
        placeholder="Full name" 
        value={form.name} 
        onChange={(e) => {
          const value = e.target.value;
          if (isValidAlphabeticInput(value)) {
            setForm((p) => ({ ...p, name: validateAlphabeticText(value) }));
            onFieldChange?.('name');
          }
        }} 
        maxLength={100} 
        className={errors.name ? "border-destructive" : ""}
      />
      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
    </div>
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        Visa Expiry Date <span className="text-destructive">*</span>
      </Label>
      <Input 
        type="date" 
        value={form.visaExpiry} 
        onChange={(e) => {
          setForm((p) => ({ ...p, visaExpiry: e.target.value }));
          onFieldChange?.('visaExpiry');
        }}
        className={errors.visaExpiry ? "border-destructive" : ""}
      />
      {errors.visaExpiry && <p className="text-xs text-destructive">{errors.visaExpiry}</p>}
    </div>
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        Emirates ID Expiry Date <span className="text-destructive">*</span>
      </Label>
      <Input 
        type="date" 
        value={form.emiratesIdExpiry} 
        onChange={(e) => {
          setForm((p) => ({ ...p, emiratesIdExpiry: e.target.value }));
          onFieldChange?.('emiratesIdExpiry');
        }}
        className={errors.emiratesIdExpiry ? "border-destructive" : ""}
      />
      {errors.emiratesIdExpiry && <p className="text-xs text-destructive">{errors.emiratesIdExpiry}</p>}
    </div>
    <Button className="w-full" onClick={onSubmit} disabled={isSubmitting}>{label}</Button>
  </div>
);

const EmployeesPage = () => {
  const { user } = useAuthContext();
  const authUserId = user?.id;
  const permissions = usePermissions();
  
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importErrorsOpen, setImportErrorsOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<{ imported: number; total: number } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<{ name?: string; visaExpiry?: string; emiratesIdExpiry?: string }>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(search);

  const pagination = useServerPagination({
    pageSize: DEFAULT_PAGE_SIZE,
    resetKey: `${statusFilter}|${deferredSearch}`,
  });

  // API queries and mutations
  const {
    employees,
    total,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useEmployeesPage({
    ...pagination.queryParams,
    search: deferredSearch,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const createEmployee = useCreateEmployee(authUserId);
  const updateEmployee = useUpdateEmployee(authUserId);
  const deleteEmployeeMutation = useDeleteEmployee(authUserId);
  const exportEmployees = useExportEmployees(authUserId);
  const importEmployees = useImportEmployees(authUserId, {
    onSuccess: (result) => {
      if (result.errors && result.errors.length > 0) {
        setImportErrors(result.errors);
        setImportSummary({ imported: result.imported, total: result.imported + result.errors.length });
        setImportErrorsOpen(true);
      } else {
        toast({
          title: 'Employees imported successfully',
          description: `${result.imported} employees have been imported.`,
        })
      }
    }
  });

  const isSubmitting = createEmployee.isPending || updateEmployee.isPending || deleteEmployeeMutation.isPending || exportEmployees.isPending || importEmployees.isPending;

  const validateForm = () => {
    const newErrors: { name?: string; visaExpiry?: string; emiratesIdExpiry?: string } = {};
    
    if (!form.name.trim()) {
      newErrors.name = "Employee name is required";
    }
    
    if (!form.visaExpiry) {
      newErrors.visaExpiry = "Visa expiry date is required";
    }
    
    if (!form.emiratesIdExpiry) {
      newErrors.emiratesIdExpiry = "Emirates ID expiry date is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = () => {
    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    
    createEmployee.mutate({
      name: form.name.trim(),
      visa_expiry: form.visaExpiry,
      emirates_id_expiry: form.emiratesIdExpiry,
    });
    
    setForm(emptyForm);
    setAddOpen(false);
  };

  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({ 
      name: emp.name, 
      visaExpiry: emp.visa_expiry || "", 
      emiratesIdExpiry: emp.emirates_id_expiry || "" 
    });
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editingId || !validateForm()) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    
    updateEmployee.mutate({
      employeeId: editingId,
      updates: {
        name: form.name.trim(),
        visa_expiry: form.visaExpiry,
        emirates_id_expiry: form.emiratesIdExpiry,
      },
    });
    
    setEditOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDeleteEmployee = (id: string, name: string) => {
    deleteEmployeeMutation.mutate({
      employeeId: id,
      employeeName: name,
    });
  };

  const handleExportCSV = () => {
    exportEmployees.mutate({
      search: deferredSearch,
      status: statusFilter === 'all' ? undefined : statusFilter,
    });
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        importEmployees.mutate(content);
        setImportOpen(false);
      }
    };
    reader.readAsText(file);
  };

  const clearFieldError = (field: string) => {
    if (errors[field as keyof typeof errors]) {
      setErrors((p) => ({ ...p, [field]: undefined }));
    }
  };

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="text-center py-8">
            <p className="text-destructive">Failed to load employees. Please try again.</p>
            <Button onClick={() => refetch()} className="mt-4">Retry</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-foreground">Employees ({error ? '—' : employees.length})</h1>
          </div>
          <div className="flex gap-2">
            {permissions.canCreateEmployees && (
              <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setForm(emptyForm); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Employee</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
                  <EmpForm form={form} setForm={setForm} onSubmit={handleAdd} label="Add Employee" errors={errors} onFieldChange={clearFieldError} isSubmitting={isSubmitting} />
                </DialogContent>
              </Dialog>
            )}
            <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={isSubmitting || employees.length === 0}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={isSubmitting}>
                  <Upload className="h-4 w-4 mr-1" /> Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Employees from CSV</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium">CSV Format Requirements:</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>First row must contain headers: <code className="bg-muted px-1 rounded">name,visa_expiry,emirates_id_expiry</code></li>
                      <li>Date format: <code className="bg-muted px-1 rounded">YYYY-MM-DD</code></li>
                      <li>Example file content:</li>
                    </ul>
                    <div className="bg-muted p-3 rounded-md mt-2">
                      <pre className="text-xs">
{`name,visa_expiry,emirates_id_expiry
"John Doe","2026-12-31","2026-12-31"
"Jane Smith","2025-06-15","2025-06-15"
"Ahmed Hassan","2024-09-20","2024-09-20"`}
                      </pre>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Note:</strong> First row contains headers only. Data starts from second row.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="csv-file">Choose CSV File</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={handleImportCSV}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Visa Expiry</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Emirates ID Expiry</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No employees found.</td></tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium">{emp.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{emp.visa_expiry}</td>
                      <td className="px-4 py-3 text-muted-foreground">{emp.emirates_id_expiry}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          emp.status === "active" ? "bg-success/10 text-success" :
                          emp.status === "warning" ? "bg-warning/10 text-warning" :
                          "bg-destructive/10 text-destructive"
                        }`}>{emp.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {permissions.canEditEmployees && (
                            <button onClick={() => openEdit(emp)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {permissions.canDeleteEmployees && (
                            <button onClick={() => handleDeleteEmployee(emp.id, emp.name)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors" disabled={isSubmitting}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
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
          pageIndex={pagination.pageIndex}
          onPageChange={pagination.setPageIndex}
          disabled={isFetching}
        />

        <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
            <EmpForm form={form} setForm={setForm} onSubmit={handleEdit} label="Save Changes" errors={errors} onFieldChange={clearFieldError} isSubmitting={isSubmitting} />
          </DialogContent>
        </Dialog>

        {/* Import Errors Dialog */}
        <Dialog open={importErrorsOpen} onOpenChange={setImportErrorsOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Import Issues</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {importSummary && (
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-sm text-muted-foreground">Import Summary</span>
                  <div className="flex gap-6 text-sm">
                    <span className="text-green-600">{importSummary.imported} imported</span>
                    <span className="text-red-600">{importSummary.total - importSummary.imported} failed</span>
                  </div>
                </div>
              )}
              
              {importErrors.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Errors:</div>
                  <div className="bg-muted border rounded-md p-3 max-h-48 overflow-y-auto">
                    <div className="space-y-1 text-sm font-mono">
                      {importErrors.map((error, index) => (
                        <div key={index} className="text-red-600">{error}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={() => setImportErrorsOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default EmployeesPage;
