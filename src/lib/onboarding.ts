import { supabase } from './supabase'

export interface CompanyData {
  name: string
  business_type: string
  employee_count: string
  owner_name: string
  whatsapp: string
}

export interface ComplianceData {
  trade_license_expiry: string
  visa_count?: string
}

export interface EmployeeData {
  name: string
  salary: string
}

export interface DocumentData {
  trade_license_path?: string
}

export class OnboardingService {
  private static instance: OnboardingService

  private constructor() {}

  static getInstance(): OnboardingService {
    if (!OnboardingService.instance) {
      OnboardingService.instance = new OnboardingService()
    }
    return OnboardingService.instance
  }

  // Create company record
  async createCompany(userId: string, data: CompanyData): Promise<{ success: boolean; error?: string; companyId?: string }> {
    try {
      const { data: companyData, error } = await supabase
        .from('companies')
        .insert({
          user_id: userId,
          name: data.name,
          business_type: data.business_type,
          employee_count: data.employee_count,
          owner_name: data.owner_name,
          whatsapp: data.whatsapp
        })
        .select('id')
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, companyId: companyData.id }
    } catch (error) {
      return { success: false, error: 'Failed to create company' }
    }
  }

  // Update company info
  async updateCompanyInfo(companyId: string, data: Partial<CompanyData>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          ...(data.employee_count && { employee_count: data.employee_count }),
          ...(data.name && { name: data.name }),
          ...(data.business_type && { business_type: data.business_type }),
          ...(data.owner_name && { owner_name: data.owner_name }),
          ...(data.whatsapp && { whatsapp: data.whatsapp })
        })
        .eq('id', companyId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to update company info' }
    }
  }

  // Update company compliance info
  async updateComplianceInfo(companyId: string, data: ComplianceData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          trade_license_expiry: data.trade_license_expiry,
          visa_count: data.visa_count
        })
        .eq('id', companyId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to update compliance info' }
    }
  }

  // Add first employee
  async addFirstEmployee(companyId: string, data: EmployeeData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('employees')
        .insert({
          company_id: companyId,
          name: data.name,
          salary: data.salary
        })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to add employee' }
    }
  }

  // Upload documents
  async uploadDocuments(companyId: string, data: DocumentData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          trade_license_path: data.trade_license_path
        })
        .eq('id', companyId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to upload documents' }
    }
  }

  // Complete onboarding process
  async completeOnboarding(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to complete onboarding' }
    }
  }
}

export const onboardingService = OnboardingService.getInstance()
