'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Package, Users, TrendingUp, AlertCircle, Clock } from 'lucide-react'
import {
  useAssetStatistics,
  useAssignmentStatistics,
  useTransferStatistics,
  useRecentAuditLogs,
} from '@/lib/api-hooks'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export default function DashboardPage() {
  const { data: assetStats, isLoading: assetStatsLoading } = useAssetStatistics()
  const { data: assignmentStats, isLoading: assignmentStatsLoading } = useAssignmentStatistics()
  const { data: transferStats, isLoading: transferStatsLoading } = useTransferStatistics()
  const { data: recentLogs, isLoading: logsLoading } = useRecentAuditLogs(5)

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, any> = {
      available: 'success',
      assigned: 'default',
      maintenance: 'warning',
      damaged: 'destructive',
      retired: 'secondary',
    }
    return variants[status] || 'default'
  }

  const totalAssets = Object.values(assetStats?.byStatus || {}).reduce((a, b) => (a as number) + (b as number), 0)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Welcome to your asset management dashboard"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Assets" value={String(totalAssets)} icon={Package} isLoading={assetStatsLoading} />
        <StatCard title="Assigned Assets" value={assignmentStats?.activeAssignments || 0} icon={Users} isLoading={assignmentStatsLoading} />
        <StatCard title="Total Value" value={formatCurrency(assetStats?.totalValue || 0)} icon={TrendingUp} isLoading={assetStatsLoading} />
        <StatCard title="Pending Actions" value={transferStats?.awaitingAction || 0} icon={AlertCircle} isLoading={transferStatsLoading} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Asset Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {assetStatsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 animate-pulse bg-muted rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(assetStats?.byStatus || {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <Badge variant={getStatusBadgeVariant(status)}>
                      {status}
                    </Badge>
                    <span className="text-table font-semibold">{count as number}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-3/4 animate-pulse bg-muted rounded" />
                    <div className="h-3 w-1/2 animate-pulse bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {recentLogs?.map((log: any) => (
                  <div key={log.id} className="flex items-start space-x-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="text-table">
                        <span className="font-medium">{log.user?.firstName || 'System'}</span>
                        {' '}
                        <span className="text-muted-foreground">{log.action}</span>
                        {' '}
                        <span className="font-medium">{log.entityType}</span>
                      </p>
                      <p className="text-helper text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {(!recentLogs || recentLogs.length === 0) && (
                  <p className="text-body text-muted-foreground text-center py-4">
                    Nothing to show yet. Activity will appear here as you manage your assets.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <a
              href="/dashboard/assets"
              className="flex items-center space-x-3 rounded-lg border p-4 transition-all duration-fast hover:shadow-card hover:border-primary/30"
            >
              <Package className="h-8 w-8 text-primary" />
              <div>
                <p className="text-[13px] font-medium">Manage Assets</p>
                <p className="text-helper text-muted-foreground">View and edit assets</p>
              </div>
            </a>
            <a
              href="/dashboard/assignments"
              className="flex items-center space-x-3 rounded-lg border p-4 transition-all duration-fast hover:shadow-card hover:border-primary/30"
            >
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-[13px] font-medium">Assignments</p>
                <p className="text-helper text-muted-foreground">Track asset assignments</p>
              </div>
            </a>
            <a
              href="/dashboard/reports"
              className="flex items-center space-x-3 rounded-lg border p-4 transition-all duration-fast hover:shadow-card hover:border-primary/30"
            >
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-[13px] font-medium">Reports</p>
                <p className="text-helper text-muted-foreground">Generate reports</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
