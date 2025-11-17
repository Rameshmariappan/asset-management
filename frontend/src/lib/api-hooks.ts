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
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.get('/categories')
      return response.data
    },
  })
}

// Vendors
export function useVendors() {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await apiClient.get('/vendors')
      return response.data
    },
  })
}

// Locations
export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await apiClient.get('/locations')
      return response.data
    },
  })
}

// Departments
export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await apiClient.get('/departments')
      return response.data
    },
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
