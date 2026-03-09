'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { usePlatformDashboard, usePlatformOrganizations, useUpdatePlatformOrganization } from '@/lib/api-hooks'
import { usePermissions } from '@/lib/permissions'
import { AccessDenied } from '@/components/access-denied'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Building2, Users, Package, DollarSign, Search, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

export default function PlatformOrganizationsPage() {
  const { isPlatformAdmin } = usePermissions()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: dashboard, isLoading: dashboardLoading } = usePlatformDashboard()
  const { data: organizations, isLoading: orgsLoading } = usePlatformOrganizations({
    search: search || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter,
  })
  const updateOrg = useUpdatePlatformOrganization()

  if (!isPlatformAdmin) return <AccessDenied />

  const handleToggleActive = async (e: React.MouseEvent, orgId: string, currentlyActive: boolean) => {
    e.stopPropagation()
    try {
      await updateOrg.mutateAsync({ id: orgId, data: { isActive: !currentlyActive } })
      toast.success(`Organization ${currentlyActive ? 'deactivated' : 'activated'}`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update organization')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="Manage all organizations on the platform"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Organizations" value={dashboard?.totalOrganizations ?? '-'} icon={Building2} iconColor="text-blue-500" isLoading={dashboardLoading} />
        <StatCard title="Active Organizations" value={dashboard?.activeOrganizations ?? '-'} icon={Building2} iconColor="text-green-500" isLoading={dashboardLoading} />
        <StatCard title="Total Users" value={dashboard?.totalUsers ?? '-'} icon={Users} iconColor="text-purple-500" isLoading={dashboardLoading} />
        <StatCard title="Total Assets" value={dashboard?.totalAssets ?? '-'} icon={Package} iconColor="text-orange-500" isLoading={dashboardLoading} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {orgsLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">Organization</th>
                <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">Slug</th>
                <th className="px-4 py-3 text-center text-[13px] font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-center text-[13px] font-medium text-muted-foreground">Users</th>
                <th className="px-4 py-3 text-center text-[13px] font-medium text-muted-foreground">Assets</th>
                <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 text-center text-[13px] font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No organizations found
                  </td>
                </tr>
              ) : (
                organizations?.map((org: any) => (
                  <tr
                    key={org.id}
                    className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/platform/organizations/${org.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                          {org.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[13px] font-medium">{org.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground">{org.slug}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={org.isActive ? 'default' : 'secondary'}>
                        {org.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-[13px]">{org._count?.users ?? 0}</td>
                    <td className="px-4 py-3 text-center text-[13px]">{org._count?.assets ?? 0}</td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground">{formatDate(org.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => handleToggleActive(e, org.id, org.isActive)}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={org.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {org.isActive ? (
                          <ToggleRight className="h-5 w-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
