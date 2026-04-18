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
  status: 'active' | 'expiring-soon' | 'expired' | 'complete'
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

class DocumentService {
  private static instance: DocumentService

  static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService()
    }
    return DocumentService.instance
  }

  async getDocuments(): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getDocument(id: string): Promise<Document | null> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async createDocument(data: CreateDocumentData, file?: File): Promise<Document> {
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Get user's company_id for RLS compliance
    const { data: userData, error: companyError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (companyError || !userData?.company_id) {
      throw new Error('Company not found for user')
    }

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
        company_id: userData.company_id,
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
      // Cleanup uploaded file if database insert fails
      if (filePath) {
        await this.deleteDocumentFile(filePath)
      }
      throw error
    }

    return document
  }

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

  async deleteDocument(id: string): Promise<void> {
    const document = await this.getDocument(id)
    if (!document) throw new Error('Document not found')

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)

    if (error) throw error

    if (document.file_path) {
      await this.deleteDocumentFile(document.file_path)
    }
  }

  async markDocumentComplete(id: string): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .update({ status: 'complete' })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async uploadDocument(file: File): Promise<{ path: string }> {
    this.validateFile(file)

    // Generate secure filename with timestamp and random string
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    if (!fileExt) {
      throw new Error('Invalid file extension')
    }

    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const fileName = `${timestamp}-${randomStr}.${fileExt}`
    const filePath = `documents/${fileName}`

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (error) throw error
    return { path: data.path }
  }

  async deleteDocumentFile(filePath: string): Promise<void> {
    if (!filePath) return

    const { error } = await supabase.storage
      .from('documents')
      .remove([filePath])

    // Log error silently for cleanup operations
    if (error) {
      console.error('File cleanup failed:', error.message)
    }
  }

  async getDocumentDownloadUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600)

    if (error) throw error
    return data.signedUrl
  }

  private validateFile(file: File): void {
    // Only PDF files allowed for security
    const allowedTypes = new Set(['application/pdf'])
    const allowedExtensions = new Set(['pdf'])
    
    const maxSize = 10 * 1024 * 1024 // 10MB
    const fileName = file.name.toLowerCase()

    // Validate MIME type
    if (!allowedTypes.has(file.type)) {
      throw new Error('Invalid file type. Only PDF files are allowed.')
    }

    // Validate file extension
    const fileExt = fileName.split('.').pop()
    if (!fileExt || !allowedExtensions.has(fileExt)) {
      throw new Error('Invalid file extension. Only PDF files are allowed.')
    }

    // Validate file size
    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 10MB.')
    }

    // Validate filename
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      throw new Error('Invalid file name.')
    }
  }

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
