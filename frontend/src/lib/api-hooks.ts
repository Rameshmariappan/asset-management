import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from './api-client'

// Assets
export function useAssets(params?: any) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: async () => {
      const response = await apiClient.get('/assets', { params })
      return response.data
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000,
  })
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ['assets', id],
    queryFn: async () => {
      const response = await apiClient.get(`/assets/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useAssetStatistics() {
  return useQuery({
    queryKey: ['assets', 'statistics'],
    queryFn: async () => {
      const response = await apiClient.get('/assets/statistics')
      return response.data
    },
  })
}

// Assignments
export function useAssignments(params?: any) {
  return useQuery({
    queryKey: ['assignments', params],
    queryFn: async () => {
      const response = await apiClient.get('/assignments', { params })
      return response.data
    },
  })
}

export function useAssignmentStatistics() {
  return useQuery({
    queryKey: ['assignments', 'statistics'],
    queryFn: async () => {
      const response = await apiClient.get('/assignments/statistics')
      return response.data
    },
  })
}

export function useUserAssignments(userId: string | undefined, params?: { isActive?: boolean }) {
  return useQuery({
    queryKey: ['assignments', 'user', userId, params],
    queryFn: async () => {
      const response = await apiClient.get(`/assignments/user/${userId}`, { params })
      return response.data
    },
    enabled: !!userId,
  })
}

export function useActiveAssignments() {
  return useQuery({
    queryKey: ['assignments', 'active'],
    queryFn: async () => {
      const response = await apiClient.get('/assignments/active')
      return response.data
    },
  })
}

// Transfers
export function useTransfers(params?: any) {
  return useQuery({
    queryKey: ['transfers', params],
    queryFn: async () => {
      const response = await apiClient.get('/transfers', { params })
      return response.data
    },
  })
}

export function useTransferStatistics() {
  return useQuery({
    queryKey: ['transfers', 'statistics'],
    queryFn: async () => {
      const response = await apiClient.get('/transfers/statistics')
      return response.data
    },
  })
}

export function usePendingTransfers() {
  return useQuery({
    queryKey: ['transfers', 'pending'],
    queryFn: async () => {
      const response = await apiClient.get('/transfers/pending')
      return response.data
    },
  })
}

// Users
export function useUsers(params?: any) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const response = await apiClient.get('/users', { params })
      return response.data
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000,
  })
}

// Notifications
export function useNotifications(params?: any) {
  return useQuery({
    queryKey: ['notifications', 'me', params],
    queryFn: async () => {
      const response = await apiClient.get('/notifications/me', { params })
      return response.data
    },
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications/me/unread-count')
      return response.data
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

// Audit Logs
export function useAuditLogs(params?: any) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: async () => {
      const response = await apiClient.get('/audit-logs', { params })
      return response.data
    },
  })
}

export function useRecentAuditLogs(limit: number = 10) {
  return useQuery({
    queryKey: ['audit-logs', 'recent', limit],
    queryFn: async () => {
      const response = await apiClient.get('/audit-logs/recent', {
        params: { limit },
      })
      return response.data
    },
  })
}

// Categories
export function useCategories(params?: any) {
  return useQuery({
    queryKey: ['categories', params],
    queryFn: async () => {
      const response = await apiClient.get('/categories', { params })
      return response.data
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000,
  })
}

// Vendors
export function useVendors(params?: any) {
  return useQuery({
    queryKey: ['vendors', params],
    queryFn: async () => {
      const response = await apiClient.get('/vendors', { params })
      return response.data
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000,
  })
}

// Locations
export function useLocations(params?: any) {
  return useQuery({
    queryKey: ['locations', params],
    queryFn: async () => {
      const response = await apiClient.get('/locations', { params })
      return response.data
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000,
  })
}

// Departments
export function useDepartments(params?: any) {
  return useQuery({
    queryKey: ['departments', params],
    queryFn: async () => {
      const response = await apiClient.get('/departments', { params })
      return response.data
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000,
  })
}

// Roles
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await apiClient.get('/roles')
      return response.data
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000,
  })
}

// Tags
export function useTags(params?: any) {
  return useQuery({
    queryKey: ['tags', params],
    queryFn: async () => {
      const response = await apiClient.get('/tags', { params })
      return response.data
    },
  })
}

// Asset History
export function useAssetHistory(id: string) {
  return useQuery({
    queryKey: ['assets', id, 'history'],
    queryFn: async () => {
      const response = await apiClient.get(`/assets/${id}/history`)
      return response.data
    },
    enabled: !!id,
  })
}

// Mutations
export function useCreateAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/assets', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.patch(`/assets/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}

export function useDeleteAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/assets/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}

export function useCreateAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/assignments', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}

export function useReturnAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.patch(`/assignments/${id}/return`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}

export function useCreateTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/transfers', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
    },
  })
}

export function useApproveTransferByManager() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const response = await apiClient.patch(`/transfers/${id}/approve/manager`, { notes })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
    },
  })
}

export function useApproveTransferByAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const response = await apiClient.patch(`/transfers/${id}/approve/admin`, { notes })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}

export function useRejectTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, rejectionReason }: { id: string; rejectionReason: string }) => {
      const response = await apiClient.patch(`/transfers/${id}/reject`, { rejectionReason })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
    },
  })
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch(`/notifications/me/${id}/read`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.patch('/notifications/me/read-all')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })
}

// Category mutations
export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/categories', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.patch(`/categories/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/categories/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

// Vendor mutations
export function useCreateVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/vendors', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

export function useUpdateVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.patch(`/vendors/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

export function useDeleteVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/vendors/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

// Location mutations
export function useCreateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/locations', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}

export function useUpdateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.patch(`/locations/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}

export function useDeleteLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/locations/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}

// Department mutations
export function useCreateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/departments', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
    },
  })
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.patch(`/departments/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
    },
  })
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/departments/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
    },
  })
}

// User mutations
export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/users', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.patch(`/users/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/users/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

// Password change
export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiClient.patch('/users/me/password', data)
      return response.data
    },
  })
}

// Update asset status
export function useUpdateAssetStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiClient.patch(`/assets/${id}/status`, { status })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}

// Generate tags
export function useGenerateQRCode() {
  return useMutation({
    mutationFn: async (assetId: string) => {
      const response = await apiClient.post(`/tags/${assetId}/qr`)
      return response.data
    },
  })
}

export function useGenerateBarcode() {
  return useMutation({
    mutationFn: async (assetId: string) => {
      const response = await apiClient.post(`/tags/${assetId}/barcode`)
      return response.data
    },
  })
}

export function useGenerateBothTags() {
  return useMutation({
    mutationFn: async (assetId: string) => {
      const response = await apiClient.post(`/tags/${assetId}/both`)
      return response.data
    },
  })
}

// Auth - Forgot Password
export function useForgotPassword() {
  return useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await apiClient.post('/auth/forgot-password', data)
      return response.data
    },
  })
}

// Auth - Reset Password
export function useResetPassword() {
  return useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      const response = await apiClient.post('/auth/reset-password', data)
      return response.data
    },
  })
}

// Organization - Update
export function useUpdateOrganization() {
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiClient.patch('/organizations/me', data)
      return response.data
    },
  })
}

// Organization - Upload Logo
export function useUploadOrganizationLogo() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await apiClient.post('/organizations/me/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
  })
}

// Organization - Delete Logo
export function useDeleteOrganizationLogo() {
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete('/organizations/me/logo')
      return response.data
    },
  })
}
