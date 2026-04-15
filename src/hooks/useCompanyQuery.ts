import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Query keys
export const companyKeys = {
  all: ['company'] as const,
  user: (userId: string) => [...companyKeys.all, 'user', userId] as const,
  name: (userId: string) => [...companyKeys.user(userId), 'name'] as const,
}

// Hook to get company name with proper caching
export function useCompanyName(userId?: string) {
  return useQuery({
    queryKey: companyKeys.name(userId || ''),
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('name')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (error) throw error;
      return data?.name || null;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });
}

// Hook to get full company data
export function useCompany(userId?: string) {
  return useQuery({
    queryKey: companyKeys.user(userId || ''),
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });
}
