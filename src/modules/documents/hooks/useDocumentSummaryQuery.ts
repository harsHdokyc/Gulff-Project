import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { documentService } from '@/modules/documents/services/documentService'
import type { Document } from '@/modules/documents/services/documentService'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'

export const documentSummaryKeys = {
  all: ['documentSummary'] as const,
  stats: (organizationId?: string) => [...documentSummaryKeys.all, 'stats', { organizationId }] as const,
  alerts: (organizationId?: string) => [...documentSummaryKeys.all, 'alerts', { organizationId }] as const,
  summary: (organizationId?: string) => [...documentSummaryKeys.all, 'summary', { organizationId }] as const,
}

export function useDocumentSummary() {
  const { organizationId } = useCurrentOrganization()
  
  return useQuery({
    queryKey: documentSummaryKeys.summary(organizationId),
    queryFn: () => documentService.getDocumentsPage({
      page: 0,
      pageSize: 100, // Get more documents for summary
      organizationId: organizationId || undefined,
    }),
    select: (result) => {
      const documents = result.documents || []
      
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
  const { organizationId } = useCurrentOrganization()
  
  return useQuery({
    queryKey: documentSummaryKeys.stats(organizationId),
    queryFn: async () => {
      const result = await documentService.getDocumentsPage({
        page: 0,
        pageSize: 100,
        organizationId: organizationId || undefined,
      })
      const documents = result.documents || []
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
  const { organizationId } = useCurrentOrganization()
  
  return useQuery({
    queryKey: documentSummaryKeys.alerts(organizationId),
    queryFn: async () => {
      const result = await documentService.getDocumentsPage({
        page: 0,
        pageSize: 100,
        organizationId: organizationId || undefined,
      })
      const documents = result.documents || []
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
  const { organizationId } = useCurrentOrganization()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Document> }) => 
      documentService.updateDocument(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentSummaryKeys.all })
      queryClient.invalidateQueries({ queryKey: documentSummaryKeys.summary(organizationId) })
      queryClient.invalidateQueries({ queryKey: documentSummaryKeys.stats(organizationId) })
      queryClient.invalidateQueries({ queryKey: documentSummaryKeys.alerts(organizationId) })
    },
    onError: (error) => {
      console.error('Failed to update document:', error)
    },
  })
}

