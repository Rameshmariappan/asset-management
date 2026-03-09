'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { usePlatformOrganization, usePlatformOrgStats, useUpdatePlatformOrganization } from '@/lib/api-hooks'
import { usePermissions } from '@/lib/permissions'
import { AccessDenied } from '@/components/access-denied'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Users, Package, DollarSign, ClipboardList, Building2, Pencil, Eye, Loader2 } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

export default function OrganizationDetailPage() {
  const { isPlatformAdmin } = usePermissions()
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: org, isLoading } = usePlatformOrganization(id)
  const { data: stats, isLoading: statsLoading } = usePlatformOrgStats(id)
  const updateOrg = useUpdatePlatformOrganization()

  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')

  if (!isPlatformAdmin) return <AccessDenied />

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Organization not found
      </div>
    )
  }

  const handleEdit = () => {
    setEditName(org.name)
    setEditOpen(true)
  }

  const handleSave = async () => {
    try {
      await updateOrg.mutateAsync({ id, data: { name: editName } })
      toast.success('Organization updated')
      setEditOpen(false)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update')
    }
  }

  const handleToggleActive = async () => {
    try {
      await updateOrg.mutateAsync({ id, data: { isActive: !org.isActive } })
      toast.success(`Organization ${org.isActive ? 'deactivated' : 'activated'}`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update')
    }
  }

  const handleViewAsOrg = () => {
    sessionStorage.setItem('platform_selected_org_id', id)
    router.push('/dashboard')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={org.name}
        backHref="/dashboard/platform/organizations"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={handleViewAsOrg}>
              <Eye className="mr-2 h-4 w-4" />
              View as this Org
            </Button>
          </div>
        }
      />

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[13px] text-muted-foreground">Name</p>
              <p className="text-[13px] font-medium mt-0.5">{org.name}</p>
            </div>
            <div>
              <p className="text-[13px] text-muted-foreground">Slug</p>
              <p className="text-[13px] font-medium mt-0.5">{org.slug}</p>
            </div>
            <div>
              <p className="text-[13px] text-muted-foreground">Status</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={org.isActive ? 'default' : 'secondary'}>
                  {org.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleToggleActive}>
                  {org.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
            <div>
              <p className="text-[13px] text-muted-foreground">Created</p>
              <p className="text-[13px] font-medium mt-0.5">{formatDate(org.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Users" value={stats?.userCount ?? '-'} icon={Users} iconColor="text-blue-500" isLoading={statsLoading} />
        <StatCard title="Assets" value={stats?.assetCount ?? '-'} icon={Package} iconColor="text-green-500" isLoading={statsLoading} />
        <StatCard title="Total Asset Value" value={stats ? formatCurrency(stats.totalAssetValue) : '-'} icon={DollarSign} iconColor="text-yellow-500" isLoading={statsLoading} />
        <StatCard title="Active Assignments" value={stats?.activeAssignments ?? '-'} icon={ClipboardList} iconColor="text-purple-500" isLoading={statsLoading} />
        <StatCard title="Departments" value={stats?.departmentCount ?? '-'} icon={Building2} iconColor="text-orange-500" isLoading={statsLoading} />
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>Update the organization name</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateOrg.isPending || !editName.trim()}>
              {updateOrg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
