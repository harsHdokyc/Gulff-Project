import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface Employee {
  id: number;
  name: string;
  visaExpiry: string;
  emiratesIdExpiry: string;
  status: string;
}

const computeStatus = (visaExpiry: string, emiratesIdExpiry: string): string => {
  const now = new Date();
  const visa = new Date(visaExpiry);
  const eid = new Date(emiratesIdExpiry);
  const earliest = visa < eid ? visa : eid;
  if (earliest < now) return "Expired";
  const diffDays = (earliest.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 30) return "Warning";
  return "Active";
};

const initialEmployees: Employee[] = [
  { id: 1, name: "Ahmed Al Maktoum", visaExpiry: "2024-04-02", emiratesIdExpiry: "2024-06-15", status: "Warning" },
  { id: 2, name: "Sara Khan", visaExpiry: "2025-01-20", emiratesIdExpiry: "2025-02-10", status: "Active" },
  { id: 3, name: "Rajesh Patel", visaExpiry: "2024-08-30", emiratesIdExpiry: "2024-09-01", status: "Active" },
  { id: 4, name: "Maria Santos", visaExpiry: "2024-03-10", emiratesIdExpiry: "2024-03-10", status: "Expired" },
];

const emptyForm = { name: "", visaExpiry: "", emiratesIdExpiry: "" };

const EmployeesPage = () => {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const filtered = employees.filter((emp) => {
    if (statusFilter !== "all" && emp.status !== statusFilter) return false;
    if (search && !emp.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAdd = () => {
    if (!form.name.trim() || !form.visaExpiry || !form.emiratesIdExpiry) {
      toast({ title: "Missing fields", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    const newEmp: Employee = {
      id: Date.now(),
      name: form.name.trim(),
      visaExpiry: form.visaExpiry,
      emiratesIdExpiry: form.emiratesIdExpiry,
      status: computeStatus(form.visaExpiry, form.emiratesIdExpiry),
    };
    setEmployees((prev) => [...prev, newEmp]);
    setForm(emptyForm);
    setAddOpen(false);
    toast({ title: "Employee added", description: `${newEmp.name} has been added.` });
  };

  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({ name: emp.name, visaExpiry: emp.visaExpiry, emiratesIdExpiry: emp.emiratesIdExpiry });
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!form.name.trim() || !form.visaExpiry || !form.emiratesIdExpiry) {
      toast({ title: "Missing fields", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === editingId
          ? { ...e, name: form.name.trim(), visaExpiry: form.visaExpiry, emiratesIdExpiry: form.emiratesIdExpiry, status: computeStatus(form.visaExpiry, form.emiratesIdExpiry) }
          : e
      )
    );
    setEditOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    toast({ title: "Employee updated" });
  };

  const deleteEmployee = (id: number) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    toast({ title: "Employee removed" });
  };

  const EmpForm = ({ onSubmit, label }: { onSubmit: () => void; label: string }) => (
    <div className="space-y-4 mt-2">
      <div className="space-y-2">
        <Label>Employee Name</Label>
        <Input placeholder="Full name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label>Visa Expiry Date</Label>
        <Input type="date" value={form.visaExpiry} onChange={(e) => setForm((p) => ({ ...p, visaExpiry: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Emirates ID Expiry Date</Label>
        <Input type="date" value={form.emiratesIdExpiry} onChange={(e) => setForm((p) => ({ ...p, emiratesIdExpiry: e.target.value }))} />
      </div>
      <Button className="w-full" onClick={onSubmit}>{label}</Button>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-2xl font-semibold text-foreground">Employees</h1>
          <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setForm(emptyForm); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Employee</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
              <EmpForm onSubmit={handleAdd} label="Add Employee" />
            </DialogContent>
          </Dialog>
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
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Warning">Warning</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
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
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No employees found.</td></tr>
                ) : (
                  filtered.map((emp) => (
                    <tr key={emp.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium">{emp.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{emp.visaExpiry}</td>
                      <td className="px-4 py-3 text-muted-foreground">{emp.emiratesIdExpiry}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          emp.status === "Active" ? "bg-success/10 text-success" :
                          emp.status === "Warning" ? "bg-warning/10 text-warning" :
                          "bg-destructive/10 text-destructive"
                        }`}>{emp.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(emp)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteEmployee(emp.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
            <EmpForm onSubmit={handleEdit} label="Save Changes" />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default EmployeesPage;
