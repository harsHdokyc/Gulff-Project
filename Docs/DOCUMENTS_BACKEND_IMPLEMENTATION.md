# DocumentsPage Backend Implementation Guide

## Overview
This document provides the complete implementation plan to transform the static DocumentsPage into a fully functional backend-integrated component using Supabase.

## Current State Analysis

### Static Implementation Issues
- ✅ Complete UI with forms, validation, search/filter
- ✅ Document type management and expiry calculations
- ❌ No database connectivity
- ❌ No file upload to storage
- ❌ No data persistence
- ❌ No multi-user/company data isolation

### Available Backend Infrastructure
- ✅ Supabase client configuration
- ✅ Complete `documents` table schema
- ✅ RLS policies for company-based access
- ✅ File storage capabilities
- ✅ React Query patterns established

## Phase 1: Document Service Layer

### 1.1 Create `/src/lib/documentService.ts`

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase'

export interface Document {
  id: string
  company_id: string
  name: string
  type: 'trade-license' | 'vat-certificate' | 'insurance' | 'lease' | 'other'
  expiry_date?: string
  file_path?: string
  file_size?: number
  mime_type?: string
  status: 'active' | 'expiring-soon' | 'expired'
  created_at: string
  updated_at: string
}

export interface CreateDocumentData {
  name: string
  type: Document['type']
  expiry_date?: string
  file?: File
}

export interface UpdateDocumentData {
  name?: string
  type?: Document['type']
  expiry_date?: string
}

export interface DocumentStats {
  total: number
  active: number
  expiring_soon: number
  expired: number
}

export interface DocumentAlert {
  id: string
  message: string
  type: 'warning' | 'danger'
  document_id: string
  document_name: string
  expiry_date: string
}

class DocumentService {
  private static instance: DocumentService

  static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService()
    }
    return DocumentService.instance
  }

  // Get all documents for the user's company
  async getDocuments(): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Get single document by ID
  async getDocument(id: string): Promise<Document | null> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  // Create new document with optional file upload
  async createDocument(data: CreateDocumentData, file?: File): Promise<Document> {
    let filePath: string | undefined
    let fileSize: number | undefined
    let mimeType: string | undefined

    // Upload file if provided
    if (file) {
      const uploadResult = await this.uploadDocument(file)
      filePath = uploadResult.path
      fileSize = file.size
      mimeType = file.type
    }

    // Create document record
    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        name: data.name,
        type: data.type,
        expiry_date: data.expiry_date,
        file_path: filePath,
        file_size: fileSize,
        mime_type: mimeType,
      })
      .select()
      .single()

    if (error) {
      // Clean up uploaded file if database insert fails
      if (filePath) {
        await this.deleteDocumentFile(filePath)
      }
      throw error
    }

    return document
  }

  // Update document metadata
  async updateDocument(id: string, updates: UpdateDocumentData): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Delete document and associated file
  async deleteDocument(id: string): Promise<void> {
    // Get document info first
    const document = await this.getDocument(id)
    if (!document) throw new Error('Document not found')

    // Delete from database
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Delete file from storage
    if (document.file_path) {
      await this.deleteDocumentFile(document.file_path)
    }
  }

  // Upload file to Supabase Storage
  async uploadDocument(file: File): Promise<{ path: string }> {
    // Validate file
    this.validateFile(file)

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `documents/${fileName}`

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error
    return { path: data.path }
  }

  // Delete file from storage
  async deleteDocumentFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from('documents')
      .remove([filePath])

    if (error) {
      console.error('Failed to delete file:', error)
      // Don't throw here as document is already deleted from DB
    }
  }

  // Get download URL for file
  async getDocumentDownloadUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (error) throw error
    return data.signedUrl
  }

  // Validate file before upload
  private validateFile(file: File): void {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ]

    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, and PNG files are allowed.')
    }

    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 10MB.')
    }
  }

  // Get document statistics
  getDocumentStats(documents: Document[]): DocumentStats {
    return {
      total: documents.length,
      active: documents.filter(d => d.status === 'active').length,
      expiring_soon: documents.filter(d => d.status === 'expiring-soon').length,
      expired: documents.filter(d => d.status === 'expired').length,
    }
  }

  // Get document alerts (expiring soon or expired)
  getDocumentAlerts(documents: Document[]): DocumentAlert[] {
    const alerts: DocumentAlert[] = []
    
    documents.forEach(doc => {
      if (doc.status === 'expiring-soon') {
        alerts.push({
          id: doc.id,
          message: `Document "${doc.name}" expires soon`,
          type: 'warning',
          document_id: doc.id,
          document_name: doc.name,
          expiry_date: doc.expiry_date || '',
        })
      } else if (doc.status === 'expired') {
        alerts.push({
          id: doc.id,
          message: `Document "${doc.name}" has expired`,
          type: 'danger',
          document_id: doc.id,
          document_name: doc.name,
          expiry_date: doc.expiry_date || '',
        })
      }
    })

    return alerts
  }

  // Subscribe to real-time document changes
  subscribeToDocuments(callback: (payload: any) => void) {
    return supabase
      .channel('documents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents'
        },
        callback
      )
      .subscribe()
  }
}

export const documentService = DocumentService.getInstance()
```

## Phase 2: React Query Hooks

### 2.1 Create `/src/hooks/useDocumentsQuery.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  documentService, 
  Document, 
  CreateDocumentData, 
  UpdateDocumentData,
  DocumentStats,
  DocumentAlert 
} from '@/lib/documentService'
import { toast } from '@/hooks/use-toast'
import { useEffect } from 'react'

export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: () => [...documentKeys.lists()] as const,
  stats: () => [...documentKeys.all, 'stats'] as const,
  alerts: () => [...documentKeys.all, 'alerts'] as const,
}

// Hook to fetch documents
export function useDocuments() {
  const queryClient = useQueryClient()

  const {
    data: documents = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: documentKeys.list(),
    queryFn: () => documentService.getDocuments(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  })

  // Set up real-time subscription
  useEffect(() => {
    const subscription = documentService.subscribeToDocuments((payload) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.list() })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient])

  return {
    documents,
    isLoading,
    error,
    refetch
  }
}

// Hook for document statistics
export function useDocumentStats() {
  const { documents } = useDocuments()

  return useQuery({
    queryKey: documentKeys.stats(),
    queryFn: () => documentService.getDocumentStats(documents),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!documents.length,
  })
}

// Hook for document alerts
export function useDocumentAlerts() {
  const { documents } = useDocuments()

  return useQuery({
    queryKey: documentKeys.alerts(),
    queryFn: () => documentService.getDocumentAlerts(documents),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!documents.length,
  })
}

// Hook to create document
export function useCreateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ data, file }: { data: CreateDocumentData; file?: File }) => 
      documentService.createDocument(data, file),
    onSuccess: (newDocument) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.list() })
      queryClient.invalidateQueries({ queryKey: documentKeys.stats() })
      queryClient.invalidateQueries({ queryKey: documentKeys.alerts() })
      
      toast({
        title: "Document uploaded",
        description: `"${newDocument.name}" has been added successfully.`,
      })
    },
    onError: (error) => {
      toast({
        title: "Error uploading document",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      })
    },
  })
}

// Hook to update document
export function useUpdateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateDocumentData }) => 
      documentService.updateDocument(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.list() })
      queryClient.invalidateQueries({ queryKey: documentKeys.stats() })
      queryClient.invalidateQueries({ queryKey: documentKeys.alerts() })
      
      toast({
        title: "Document updated",
        description: "Document has been updated successfully.",
      })
    },
    onError: (error) => {
      toast({
        title: "Error updating document",
        description: error instanceof Error ? error.message : "Failed to update document",
        variant: "destructive",
      })
    },
  })
}

// Hook to delete document
export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => documentService.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.list() })
      queryClient.invalidateQueries({ queryKey: documentKeys.stats() })
      queryClient.invalidateQueries({ queryKey: documentKeys.alerts() })
      
      toast({
        title: "Document deleted",
        description: "Document has been removed successfully.",
      })
    },
    onError: (error) => {
      toast({
        title: "Error deleting document",
        description: error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive",
      })
    },
  })
}

// Hook to download document
export function useDownloadDocument() {
  return useMutation({
    mutationFn: (filePath: string) => documentService.getDocumentDownloadUrl(filePath),
    onSuccess: (url, filePath) => {
      // Create download link
      const link = document.createElement('a')
      link.href = url
      link.download = filePath.split('/').pop() || 'document'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    },
    onError: (error) => {
      toast({
        title: "Error downloading document",
        description: error instanceof Error ? error.message : "Failed to download document",
        variant: "destructive",
      })
    },
  })
}

// Hook to get document download URL for preview
export function useDocumentPreview() {
  return useMutation({
    mutationFn: (filePath: string) => documentService.getDocumentDownloadUrl(filePath),
    onError: (error) => {
      toast({
        title: "Error loading document",
        description: error instanceof Error ? error.message : "Failed to load document",
        variant: "destructive",
      })
    },
  })
}
```

## Phase 3: DocumentsPage Refactor

### 3.1 Updated DocumentsPage Structure

```typescript
// Replace imports at top
import { useDocuments, useCreateDocument, useUpdateDocument, useDeleteDocument, useDownloadDocument } from '@/hooks/useDocumentsQuery'
import type { Document } from '@/lib/documentService'

// Replace local state
const DocumentsPage = () => {
  const { documents, isLoading } = useDocuments()
  const createDocument = useCreateDocument()
  const updateDocument = useUpdateDocument()
  const deleteDocument = useDeleteDocument()
  const downloadDocument = useDownloadDocument()
  
  // Keep local UI state
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<{ name?: string; type?: string; expiry?: string; file?: string }>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Filter documents
  const filtered = documents.filter((doc) => {
    if (statusFilter !== "all" && doc.status !== statusFilter) return false
    if (search && !doc.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Handle create
  const handleAdd = () => {
    if (!validateForm(true)) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" })
      return
    }
    
    const docName = form.name.trim()
    createDocument.mutate({
      data: {
        name: docName,
        type: form.type as Document['type'],
        expiry_date: form.expiry || undefined,
      },
      file: selectedFile || undefined
    })

    // Reset form
    setForm(emptyForm)
    setSelectedFile(null)
    setAddOpen(false)
  }

  // Handle edit
  const openEdit = (doc: Document) => {
    setEditingId(doc.id)
    setForm({ 
      name: doc.name, 
      type: doc.type, 
      expiry: doc.expiry_date || '', 
      fileName: doc.file_path?.split('/').pop() || '' 
    })
    setEditOpen(true)
  }

  const handleEdit = () => {
    if (!editingId || !validateForm(false)) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" })
      return
    }
    
    updateDocument.mutate({
      id: editingId,
      updates: {
        name: form.name.trim(),
        type: form.type as Document['type'],
        expiry_date: form.expiry || undefined,
      }
    })

    setEditOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  // Handle delete
  const deleteDoc = (id: string) => {
    deleteDocument.mutate(id)
  }

  // Handle download
  const downloadDoc = (doc: Document) => {
    if (doc.file_path) {
      downloadDocument.mutate(doc.file_path)
    } else {
      toast({
        title: "No file available",
        description: "This document doesn't have an associated file.",
        variant: "destructive"
      })
    }
  }

  // Loading states
  const isOperating = createDocument.isPending || updateDocument.isPending || deleteDocument.isPending

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto animate-fade-in">
        {/* Show loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading documents...</div>
          </div>
        )}
        
        {/* Rest of the component remains similar */}
        {/* Update buttons to use new handlers */}
        {/* Add loading states to buttons */}
        {/* Enable/disable actions based on file availability */}
      </div>
    </AppLayout>
  )
}
```

## Phase 4: Supabase Storage Setup

### 4.1 Create Storage Bucket

```sql
-- Run in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
);
```

### 4.2 Storage RLS Policies

```sql
-- Users can upload to their company's folder
CREATE POLICY "Users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Users can view their company's documents
CREATE POLICY "Users can view documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Users can update their company's documents
CREATE POLICY "Users can update documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Users can delete their company's documents
CREATE POLICY "Users can delete documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = (SELECT company_id FROM users WHERE id = auth.uid())
  );
```

## Phase 5: Enhanced Features

### 5.1 Document Preview Modal

```typescript
// Add to DocumentsPage
const [previewOpen, setPreviewOpen] = useState(false)
const [previewUrl, setPreviewUrl] = useState<string | null>(null)
const documentPreview = useDocumentPreview()

const openPreview = async (doc: Document) => {
  if (doc.file_path) {
    const url = await documentPreview.mutateAsync(doc.file_path)
    setPreviewUrl(url)
    setPreviewOpen(true)
  }
}

// Preview modal component
<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
  <DialogContent className="max-w-4xl max-h-[80vh]">
    <DialogHeader>
      <DialogTitle>Document Preview</DialogTitle>
    </DialogHeader>
    {previewUrl && (
      <iframe 
        src={previewUrl} 
        className="w-full h-[60vh] border rounded"
        title="Document Preview"
      />
    )}
  </DialogContent>
</Dialog>
```

### 5.2 Drag & Drop Upload

```typescript
// Add drag and drop functionality
const [isDragging, setIsDragging] = useState(false)

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault()
  setIsDragging(true)
}

const handleDragLeave = (e: React.DragEvent) => {
  e.preventDefault()
  setIsDragging(false)
}

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault()
  setIsDragging(false)
  const files = Array.from(e.dataTransfer.files)
  if (files.length > 0) {
    setSelectedFile(files[0])
  }
}

// Apply to upload area
<div 
  className={`rounded-md border border-dashed p-6 text-center transition-colors ${
    isDragging ? "border-primary bg-primary/5" : 
    errors.file ? "border-destructive" : "border-border"
  }`}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
>
  {/* Upload content */}
</div>
```

## Implementation Checklist

### Phase 1: Service Layer
- [ ] Create `documentService.ts`
- [ ] Implement all CRUD operations
- [ ] Add file upload/download functionality
- [ ] Add validation and error handling
- [ ] Add real-time subscription support

### Phase 2: React Query Hooks
- [ ] Create `useDocumentsQuery.ts`
- [ ] Implement all query hooks
- [ ] Add mutation hooks with optimistic updates
- [ ] Add proper error handling and toasts

### Phase 3: DocumentsPage Integration
- [ ] Replace local state with React Query
- [ ] Update all CRUD handlers
- [ ] Add loading states
- [ ] Add file upload/download functionality
- [ ] Test all operations

### Phase 4: Storage Setup
- [ ] Create storage bucket
- [ ] Set up RLS policies
- [ ] Test file upload/download
- [ ] Verify security

### Phase 5: Enhanced Features
- [ ] Add document preview
- [ ] Implement drag & drop
- [ ] Add bulk operations
- [ ] Add advanced filtering
- [ ] Add document statistics

## Testing Requirements

### Unit Tests
- Service layer functions
- React Query hooks
- Form validation
- File upload/download

### Integration Tests
- Database operations
- Storage operations
- Real-time updates
- Error scenarios

### E2E Tests
- Complete document workflow
- File upload/download
- Real-time collaboration
- Permission boundaries

## Security Considerations

### File Upload Security
- File type validation
- File size limits
- Virus scanning (if needed)
- Company-based isolation

### Database Security
- RLS policies enforcement
- SQL injection prevention
- Data validation
- Audit logging

### Access Control
- User authentication
- Company-based data isolation
- Role-based permissions
- File access control

## Performance Optimizations

### Database
- Proper indexing
- Query optimization
- Connection pooling
- Caching strategies

### File Storage
- CDN integration
- File compression
- Lazy loading
- Thumbnail generation

### Frontend
- React Query caching
- Optimistic updates
- Infinite scrolling
- Virtualization for large lists

This implementation plan provides a complete roadmap to transform the static DocumentsPage into a production-ready, backend-integrated component with full CRUD operations, file management, and real-time capabilities.
