import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle, Eye, Trash2, Search, Edit } from "lucide-react";
import { useState, useDeferredValue } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useDocumentsPage, useCreateDocument, useUpdateDocument, useDeleteDocument, useMarkDocumentComplete } from "@/modules/documents/hooks/useDocumentsQuery";
import type { Document } from "@/modules/documents/services/documentService";
import { validateAlphabeticText, isValidAlphabeticInput, getMinDate } from "@/modules/auth/services/formValidation";
import {
  DOCUMENT_STATUS_FILTER_OPTIONS,
  documentStatusBadgeClass,
  documentStatusLabel,
  statusFilterValueToDbStatus,
} from "@/modules/documents/services/documentStatus";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { SimplePagination } from "@/components/Pagination";
import { useServerPagination } from "@/hooks/useServerPagination";
import { usePermissions } from "@/hooks/usePermissions";
import { useTranslation } from "react-i18next";

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

const DocForm = ({ form, setForm, onSubmit, label, errors = {}, onFieldChange, selectedFile, setSelectedFile }: DocFormProps) => {
  const { t } = useTranslation();
  
  return (
  <div className="space-y-4 mt-2">
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {t('documents.name')} <span className="text-destructive">*</span>
      </Label>
      <Input 
        placeholder={t('documents.name')} 
        value={form.name} 
        onChange={(e) => {
          const value = validateAlphabeticText(e.target.value);
          setForm((p) => ({ ...p, name: value }));
          onFieldChange?.('name');
        }} 
        maxLength={100} 
        className={errors.name ? "border-destructive" : ""}
      />
      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
    </div>
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {t('documents.category')} <span className="text-destructive">*</span>
      </Label>
      <Select 
        value={form.type} 
        onValueChange={(v) => {
          setForm((p) => ({ ...p, type: v }));
          onFieldChange?.('type');
        }}
      >
        <SelectTrigger className={errors.type ? "border-destructive" : ""}>
          <SelectValue placeholder={t('common.select')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="trade-license">{t('documents.tradeLicense')}</SelectItem>
          <SelectItem value="vat-certificate">{t('documents.vatCertificate')}</SelectItem>
          <SelectItem value="insurance">{t('documents.insurance')}</SelectItem>
          <SelectItem value="lease">{t('documents.lease')}</SelectItem>
          <SelectItem value="other">{t('common.other')}</SelectItem>
        </SelectContent>
      </Select>
      {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
    </div>
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {t('compliance.expiryDate')} <span className="text-destructive">*</span>
      </Label>
      <Input 
        type="date" 
        value={form.expiry} 
        min={getMinDate()}
        onChange={(e) => {
          setForm((p) => ({ ...p, expiry: e.target.value }));
          onFieldChange?.('expiry');
        }} 
        className={errors.expiry ? "border-destructive" : ""}
      />
      {errors.expiry && <p className="text-xs text-destructive">{errors.expiry}</p>}
    </div>
    {label === t('documents.uploadNew') && (
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          {t('documents.name')} <span className="text-destructive">*</span>
        </Label>
        <div className={`rounded-md border border-dashed p-6 text-center ${errors.file ? "border-destructive" : "border-border"}`}>
          {selectedFile ? (
            <p className="text-sm text-foreground">{selectedFile.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{t('documents.dragDropFile')}</p>
          )}
          <input
            type="file"
            className="hidden"
            id="doc-file-input"
            onChange={(e) => {
              setSelectedFile?.(e.target.files?.[0] || null);
              onFieldChange?.('file');
            }}
            accept=".pdf"
          />
          <Button variant="outline" size="sm" className="mt-2" onClick={() => document.getElementById("doc-file-input")?.click()}>
            {t('common.view')}
          </Button>
        </div>
        {errors.file && <p className="text-xs text-destructive">{errors.file}</p>}
      </div>
    )}
    <Button className="w-full" onClick={onSubmit}>{label}</Button>
  </div>
  );
};

const DocumentsPage = () => {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState("all");

  const statusDb = statusFilterValueToDbStatus(statusFilter);

  const pagination = useServerPagination({
    pageSize: DEFAULT_PAGE_SIZE,
    resetKey: `${statusFilter}|${deferredSearch}`,
  });
  
  const { documents, total, isLoading, isFetching } = useDocumentsPage({
    ...pagination.queryParams,
    search: deferredSearch,
    status: statusDb,
  });
  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();
  const markDocumentComplete = useMarkDocumentComplete();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completingDoc, setCompletingDoc] = useState<Document | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<{ name?: string; type?: string; expiry?: string; file?: string }>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const validateForm = (isUpload: boolean = false) => {
    const newErrors: { name?: string; type?: string; expiry?: string; file?: string } = {};
    
    if (!form.name.trim()) {
      newErrors.name = t('validation.required');
    } else if (!isValidAlphabeticInput(form.name)) {
      newErrors.name = t('validation.nameInvalid');
    }
    
    if (!form.type) {
      newErrors.type = t('validation.required');
    }
    
    if (!form.expiry) {
      newErrors.expiry = t('validation.required');
    }
    
    if (isUpload && !selectedFile) {
      newErrors.file = t('validation.required');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = () => {
    if (!validateForm(true)) {
      toast({ title: t('errors.validationError'), description: t('errors.general'), variant: "destructive" });
      return;
    }
    
    const docName = form.name.trim();
    setIsUploading(true);
    
    createDocument.mutate({
      data: {
        name: docName,
        type: form.type as Document['type'],
        expiry_date: form.expiry || undefined,
      },
      file: selectedFile || undefined
    }, {
      onSuccess: () => {
        setIsUploading(false);
        setForm(emptyForm);
        setSelectedFile(null);
        setAddOpen(false);
      },
      onError: () => {
        setIsUploading(false);
      }
    });
  };

  const openEdit = (doc: Document) => {
    setEditingId(doc.id);
    setForm({ 
      name: doc.name, 
      type: doc.type, 
      expiry: doc.expiry_date || '', 
      fileName: doc.file_path?.split('/').pop() || '' 
    });
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editingId || !validateForm(false)) {
      toast({ title: t('errors.validationError'), description: t('errors.general'), variant: "destructive" });
      return;
    }
    
    updateDocument.mutate({
      id: editingId,
      updates: {
        name: form.name.trim(),
        type: form.type as Document['type'],
        expiry_date: form.expiry || undefined,
      }
    });

    setEditOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const deleteDoc = (id: string) => {
    deleteDocument.mutate(id);
  };
  
  const openCompleteConfirmation = (doc: Document) => {
    setCompletingDoc(doc);
    setCompleteOpen(true);
  };

  const handleComplete = () => {
    if (completingDoc) {
      markDocumentComplete.mutate(completingDoc.id);
      setCompleteOpen(false);
      setCompletingDoc(null);
    }
  };

  const previewDoc = async (doc: Document) => {
    if (doc.file_path) {
      try {
        const { documentService } = await import('@/modules/documents/services/documentService');
        const url = await documentService.getDocumentDownloadUrl(doc.file_path);
        setPreviewUrl(url);
        setPreviewOpen(true);
      } catch (error) {
        toast({
          title: t('errors.general'),
          description: t('errors.loadError'),
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: t('errors.notFound'),
        description: t('errors.general'),
        variant: "destructive"
      });
    }
  };

  const clearFieldError = (field: string) => {
    if (errors[field as keyof typeof errors]) {
      setErrors((p) => ({ ...p, [field]: undefined }));
    }
  };

  const isOperating =
    createDocument.isPending ||
    updateDocument.isPending ||
    deleteDocument.isPending ||
    markDocumentComplete.isPending ||
    isUploading;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-2xl font-semibold text-foreground">{t('documents.title')} ({total})</h1>
          {permissions.canCreateDocuments && (
            <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setForm(emptyForm); setSelectedFile(null); } }}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={isOperating}><CheckCircle className="h-4 w-4 mr-1" /> {t('documents.uploadNew')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('documents.uploadNew')}</DialogTitle>
                  {isUploading && (
                    <div className="text-sm text-muted-foreground mb-2">
                      {t('common.loading')}...
                    </div>
                  )}
                </DialogHeader>
                <DocForm 
                  form={form} 
                  setForm={setForm} 
                  onSubmit={handleAdd} 
                  label={isUploading ? t('common.loading') : t('documents.uploadNew')} 
                  errors={errors} 
                  onFieldChange={clearFieldError} 
                  selectedFile={selectedFile} 
                  setSelectedFile={setSelectedFile} 
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('documents.searchDocuments')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder={t('common.status')} /></SelectTrigger>
            <SelectContent>
              {DOCUMENT_STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          className={`rounded-lg border border-border bg-card overflow-hidden transition-opacity ${isFetching ? "opacity-80" : ""}`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('documents.name')}</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('documents.category')}</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('compliance.expiryDate')}</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('common.status')}</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      {isLoading ? t('common.loading') : t('documents.noDocumentsFound')}
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium">{doc.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{docTypeLabels[doc.type] || doc.type}</td>
                      <td className="px-4 py-3 text-muted-foreground">{doc.expiry_date || t('documents.noExpiry')}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${documentStatusBadgeClass(doc.status)}`}
                        >
                          {documentStatusLabel(doc.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => previewDoc(doc)} 
                            disabled={isOperating || !doc.file_path}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {doc.status !== "complete" && (
                            <button
                              type="button"
                              onClick={() => openCompleteConfirmation(doc)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-green-600 transition-colors"
                              disabled={isOperating}
                              title="Mark as complete"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {permissions.canEditDocuments && (
                            <button 
                              onClick={() => openEdit(doc)} 
                              disabled={doc.status === "complete" || isOperating}
                              className={`p-1.5 rounded-md transition-colors ${
                                doc.status === "complete"
                                  ? "text-muted-foreground/50 cursor-not-allowed"
                                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
                              }`}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {permissions.canDeleteDocuments && (
                            <button 
                              onClick={() => deleteDoc(doc.id)} 
                              disabled={doc.status === "complete" || isOperating}
                              className={`p-1.5 rounded-md transition-colors ${
                                doc.status === "complete"
                                  ? "text-muted-foreground/50 cursor-not-allowed"
                                  : "text-muted-foreground hover:text-destructive hover:bg-accent"
                              }`}
                            >
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
            <DialogHeader><DialogTitle>{t('common.edit')} {t('documents.name')}</DialogTitle></DialogHeader>
            <DocForm form={form} setForm={setForm} onSubmit={handleEdit} label={t('common.save')} errors={errors} onFieldChange={clearFieldError} />
          </DialogContent>
        </Dialog>

        {/* Preview Modal */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{t('documents.documentDetails')}</DialogTitle>
            </DialogHeader>
            {previewUrl && (
              <iframe 
                src={previewUrl} 
                className="w-full h-[60vh] border rounded"
                title={t('documents.documentDetails')}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={completeOpen}
          onOpenChange={(o) => {
            setCompleteOpen(o);
            if (!o) setCompletingDoc(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('common.completed')}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                {t('documents.approveConfirm')} "{completingDoc?.name}" {t('common.completed')}?
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCompleteOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleComplete}>{t('common.completed')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
};

export default DocumentsPage;
