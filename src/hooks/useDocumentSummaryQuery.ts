import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { documentService } from '@/lib/documentService'
import type { Document } from '@/lib/documentService'

export const documentSummaryKeys = {
  all: ['documentSummary'] as const,
  stats: ['documentSummary', 'stats'] as const,
  alerts: ['documentSummary', 'alerts'] as const,
}

export function useDocumentSummary() {
  return useQuery({
    queryKey: documentSummaryKeys.all,
    queryFn: () => documentService.getDocuments(),
    select: (documents) => {
      // Calculate document stats
      const stats = {
        total: documents.length,
        active: documents.filter(d => d.status === 'active').length,
        expiring: documents.filter(d => d.status === 'expiring-soon').length,
        expired: documents.filter(d => d.status === 'expired').length,
        complete: documents.filter(d => d.status === 'complete').length,
      }

      // Calculate document alerts (expiring soon and expired)
      const alerts = documents
        .filter(d => d.status === 'expiring-soon' || d.status === 'expired')
        .map(d => ({
          id: d.id,
          name: d.name,
          status: d.status,
          expiry_date: d.expiry_date,
          type: d.type,
        }))

      return {
        documents,
        stats,
        alerts,
        upcomingDeadlines: documents
          .filter(d => d.status !== 'complete' && d.status !== 'expired')
          .sort((a, b) => {
            if (!a.expiry_date) return 1
            if (!b.expiry_date) return -1
            return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
          })
      }
    },
  })
}

export function useDocumentStats() {
  return useQuery({
    queryKey: documentSummaryKeys.stats,
    queryFn: async () => {
      const documents = await documentService.getDocuments()
      return {
        total: documents.length,
        active: documents.filter(d => d.status === 'active').length,
        expiring: documents.filter(d => d.status === 'expiring-soon').length,
        expired: documents.filter(d => d.status === 'expired').length,
        complete: documents.filter(d => d.status === 'complete').length,
      }
    },
  })
}

export function useDocumentAlerts() {
  return useQuery({
    queryKey: documentSummaryKeys.alerts,
    queryFn: async () => {
      const documents = await documentService.getDocuments()
      return documents
        .filter(d => d.status === 'expiring-soon' || d.status === 'expired')
        .map(d => ({
          id: d.id,
          name: d.name,
          status: d.status,
          expiry_date: d.expiry_date,
          type: d.type,
        }))
    },
  })
}

export function useUpdateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Document> }) => 
      documentService.updateDocument(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentSummaryKeys.all })
    },
    onError: (error) => {
      console.error('Failed to update document:', error)
    },
  })
}

