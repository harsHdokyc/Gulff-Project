import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Query keys
export const companyKeys = {
  all: ['company'] as const,
  user: (userId: string) => [...companyKeys.all, 'user', userId] as const,
  name: (userId: string) => [...companyKeys.user(userId), 'name'] as const,
  profileRole: (userId: string) =>
    [...companyKeys.all, 'profileRole', userId] as const,
}

/** Current row in `public.users` — used for nav (e.g. hide User Management from employees). */
export function useCurrentUserRole(userId?: string) {
  return useQuery({
    queryKey: companyKeys.profileRole(userId || ''),
    queryFn: async () => {
      if (!userId) return null

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error
      return (data?.role as string | undefined) ?? null
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  })
}

// Hook to get company name with proper caching
export function useCompanyName(userId?: string) {
  return useQuery({
    queryKey: companyKeys.name(userId || ''),
    queryFn: async () => {
      if (!userId) return null;
      
      // Use the get_user_company function to get the company ID efficiently
      const { data: companyId, error: idError } = await supabase
        .rpc('get_user_company');

      if (idError) throw idError;
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
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
      
      // Use the get_user_company function to get the company ID efficiently
      const { data: companyId, error: idError } = await supabase
        .rpc('get_user_company');

      if (idError) throw idError;
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
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
