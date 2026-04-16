import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Download, Trash2, Search, Edit } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface Doc {
  id: number;
  name: string;
  type: string;
  expiry: string;
  status: string;
  fileName?: string;
}

const computeDocStatus = (expiry: string): string => {
  const now = new Date();
  const exp = new Date(expiry);
  if (exp < now) return "Expired";
  const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 30) return "Expiring Soon";
  return "Active";
};

const docTypeLabels: Record<string, string> = {
  "trade-license": "Trade License",
  "vat-certificate": "VAT Certificate",
  "insurance": "Insurance Policy",
  "lease": "Lease Agreement",
  "other": "Other",
};

const emptyForm = { name: "", type: "", expiry: "", fileName: "" };

interface DocFormProps {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  onSubmit: () => void;
  label: string;
  errors?: { name?: string; type?: string; expiry?: string; file?: string };
  onFieldChange?: (field: string) => void;
  selectedFile?: File | null;
  setSelectedFile?: React.Dispatch<React.SetStateAction<File | null>>;
}

const DocForm = ({ form, setForm, onSubmit, label, errors = {}, onFieldChange, selectedFile, setSelectedFile }: DocFormProps) => (
  <div className="space-y-4 mt-2">
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        Document Name <span className="text-destructive">*</span>
      </Label>
      <Input 
        placeholder="e.g., Trade License 2025" 
        value={form.name} 
        onChange={(e) => {
          setForm((p) => ({ ...p, name: e.target.value }));
          onFieldChange?.('name');
        }} 
        maxLength={100} 
        className={errors.name ? "border-destructive" : ""}
      />
      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
    </div>
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        Document Type <span className="text-destructive">*</span>
      </Label>
      <Select 
        value={form.type} 
        onValueChange={(v) => {
          setForm((p) => ({ ...p, type: v }));
          onFieldChange?.('type');
        }}
      >
        <SelectTrigger className={errors.type ? "border-destructive" : ""}>
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="trade-license">Trade License</SelectItem>
          <SelectItem value="vat-certificate">VAT Certificate</SelectItem>
          <SelectItem value="insurance">Insurance Policy</SelectItem>
          <SelectItem value="lease">Lease Agreement</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>
      {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
    </div>
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        Expiry Date <span className="text-destructive">*</span>
      </Label>
      <Input 
        type="date" 
        value={form.expiry} 
        onChange={(e) => {
          setForm((p) => ({ ...p, expiry: e.target.value }));
          onFieldChange?.('expiry');
        }}
        className={errors.expiry ? "border-destructive" : ""}
      />
      {errors.expiry && <p className="text-xs text-destructive">{errors.expiry}</p>}
    </div>
    {label === "Upload Document" && (
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          File <span className="text-destructive">*</span>
        </Label>
        <div className={`rounded-md border border-dashed p-6 text-center ${errors.file ? "border-destructive" : "border-border"}`}>
          {selectedFile ? (
            <p className="text-sm text-foreground">{selectedFile.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Drag & drop or click to browse</p>
          )}
          <input
            type="file"
            className="hidden"
            id="doc-file-input"
            onChange={(e) => {
              setSelectedFile?.(e.target.files?.[0] || null);
              onFieldChange?.('file');
            }}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
          <Button variant="outline" size="sm" className="mt-2" onClick={() => document.getElementById("doc-file-input")?.click()}>
            Browse
          </Button>
        </div>
        {errors.file && <p className="text-xs text-destructive">{errors.file}</p>}
      </div>
    )}
    <Button className="w-full" onClick={onSubmit}>{label}</Button>
  </div>
);

const DocumentsPage = () => {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<{ name?: string; type?: string; expiry?: string; file?: string }>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const filtered = docs.filter((doc) => {
    if (statusFilter !== "all" && doc.status !== statusFilter) return false;
    if (search && !doc.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const validateForm = (isUpload: boolean = false) => {
    const newErrors: { name?: string; type?: string; expiry?: string; file?: string } = {};
    
    if (!form.name.trim()) {
      newErrors.name = "Document name is required";
    }
    
    if (!form.type) {
      newErrors.type = "Document type is required";
    }
    
    if (!form.expiry) {
      newErrors.expiry = "Expiry date is required";
    }
    
    if (isUpload && !selectedFile) {
      newErrors.file = "File is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = () => {
    if (!validateForm(true)) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    const docName = form.name.trim();
    const newDoc: Doc = {
      id: Date.now(),
      name: docName,
      type: form.type,
      expiry: form.expiry,
      status: computeDocStatus(form.expiry),
      fileName: selectedFile?.name,
    };
    setDocs((prev) => [...prev, newDoc]);
    setForm(emptyForm);
    setSelectedFile(null);
    setAddOpen(false);
    toast({ title: "Document uploaded", description: `"${docName}" has been added.` });
  };

  const openEdit = (doc: Doc) => {
    setEditingId(doc.id);
    setForm({ name: doc.name, type: doc.type, expiry: doc.expiry, fileName: doc.fileName || "" });
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editingId || !validateForm(false)) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    const docName = form.name.trim();
    setDocs((prev) =>
      prev.map((d) =>
        d.id === editingId ? { ...d, name: docName, type: form.type, expiry: form.expiry, status: computeDocStatus(form.expiry) } : d
      )
    );
    setEditOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    toast({ title: "Document updated" });
  };

  const deleteDoc = (id: number) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    toast({ title: "Document deleted" });
  };

  const clearFieldError = (field: string) => {
    if (errors[field as keyof typeof errors]) {
      setErrors((p) => ({ ...p, [field]: undefined }));
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-2xl font-semibold text-foreground">Documents</h1>
          <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setForm(emptyForm); setSelectedFile(null); } }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Upload Document</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
              <DocForm form={form} setForm={setForm} onSubmit={handleAdd} label="Upload Document" errors={errors} onFieldChange={clearFieldError} selectedFile={selectedFile} setSelectedFile={setSelectedFile} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Document Name</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Expiry Date</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No documents found.</td></tr>
                ) : (
                  filtered.map((doc) => (
                    <tr key={doc.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium">{doc.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{docTypeLabels[doc.type] || doc.type}</td>
                      <td className="px-4 py-3 text-muted-foreground">{doc.expiry}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          doc.status === "Active" ? "bg-success/10 text-success" :
                          doc.status === "Expiring Soon" ? "bg-warning/10 text-warning" :
                          "bg-destructive/10 text-destructive"
                        }`}>{doc.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(doc)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteDoc(doc.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors">
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
            <DialogHeader><DialogTitle>Edit Document</DialogTitle></DialogHeader>
            <DocForm form={form} setForm={setForm} onSubmit={handleEdit} label="Save Changes" errors={errors} onFieldChange={clearFieldError} />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default DocumentsPage;
