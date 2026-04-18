import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  documentService, 
  Document, 
  CreateDocumentData, 
  UpdateDocumentData 
} from '@/lib/documentService'
import { toast } from '@/hooks/use-toast'
import { useEffect } from 'react'
import { documentSummaryKeys } from '@/hooks/useDocumentSummaryQuery'

export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: () => [...documentKeys.lists()] as const,
}

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
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('not authenticated')) return false
      return failureCount < 3
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  useEffect(() => {
    const subscription = documentService.subscribeToDocuments(() => {
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

export function useCreateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ data, file }: { data: CreateDocumentData; file?: File }) => 
      documentService.createDocument(data, file),
    onSuccess: (newDocument) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.list() })
      
      toast({
        title: "Document uploaded",
        description: `"${newDocument.name}" has been added successfully.`,
      })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to upload document"
      
      // Show user-friendly error messages
      const userMessage = message.includes('not authenticated') 
        ? 'Please sign in to upload documents'
        : message.includes('Invalid file')
        ? 'Please check file format and size'
        : message.includes('Company not found')
        ? 'User profile incomplete. Please contact support.'
        : 'Failed to upload document. Please try again.'
      
      toast({
        title: "Upload failed",
        description: userMessage,
        variant: "destructive",
      })
    },
  })
}

export function useUpdateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateDocumentData }) => 
      documentService.updateDocument(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.list() })
      
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

export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => documentService.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.list() })
      
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

export function useDownloadDocument() {
  return useMutation({
    mutationFn: (filePath: string) => documentService.getDocumentDownloadUrl(filePath),
    onSuccess: (url, filePath) => {
      // Create download link with proper error handling
      try {
        const link = document.createElement('a')
        link.href = url
        link.download = filePath.split('/').pop() || 'document'
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        toast({
          title: "Download started",
          description: "Document download has started.",
        })
      } catch (error) {
        toast({
          title: "Download failed",
          description: "Could not start download. Please try again.",
          variant: "destructive",
        })
      }
    },
    onError: (error) => {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download document",
        variant: "destructive",
      })
    },
  })
}

export function useMarkDocumentComplete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => documentService.markDocumentComplete(id),
    onSuccess: (updatedDocument) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.list() })
      queryClient.invalidateQueries({ queryKey: documentSummaryKeys.all })

      toast({
        title: "Document completed",
        description: `"${updatedDocument.name}" has been marked as complete.`,
      })
    },
    onError: (error) => {
      toast({
        title: "Failed to complete document",
        description: error instanceof Error ? error.message : "Failed to mark document as complete",
        variant: "destructive",
      })
    },
  })
}

