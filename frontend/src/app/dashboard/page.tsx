'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your asset management dashboard
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assetStatsLoading ? (
                <div className="h-7 w-16 animate-pulse bg-gray-200 rounded" />
              ) : (
                Object.values(assetStats?.byStatus || {}).reduce((a: number, b: number) => a + b, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              All registered assets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Assets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assignmentStatsLoading ? (
                <div className="h-7 w-16 animate-pulse bg-gray-200 rounded" />
              ) : (
                assignmentStats?.activeAssignments || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently in use
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assetStatsLoading ? (
                <div className="h-7 w-24 animate-pulse bg-gray-200 rounded" />
              ) : (
                formatCurrency(assetStats?.totalValue || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Current asset value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transferStatsLoading ? (
                <div className="h-7 w-16 animate-pulse bg-gray-200 rounded" />
              ) : (
                transferStats?.awaitingAction || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Transfers & approvals
            </p>
          </CardContent>
        </Card>
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
                  <div key={i} className="h-8 animate-pulse bg-gray-200 rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(assetStats?.byStatus || {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant={getStatusBadgeVariant(status)}>
                        {status}
                      </Badge>
                    </div>
                    <span className="font-semibold">{count as number}</span>
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
                    <div className="h-4 w-3/4 animate-pulse bg-gray-200 rounded" />
                    <div className="h-3 w-1/2 animate-pulse bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {recentLogs?.map((log: any) => (
                  <div key={log.id} className="flex items-start space-x-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">{log.user?.firstName || 'System'}</span>
                        {' '}
                        <span className="text-muted-foreground">{log.action}</span>
                        {' '}
                        <span className="font-medium">{log.entityType}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {!recentLogs || recentLogs.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
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
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <a
              href="/dashboard/assets"
              className="flex items-center space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <Package className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Manage Assets</p>
                <p className="text-sm text-muted-foreground">View and edit assets</p>
              </div>
            </a>
            <a
              href="/dashboard/assignments"
              className="flex items-center space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Assignments</p>
                <p className="text-sm text-muted-foreground">Track asset assignments</p>
              </div>
            </a>
            <a
              href="/dashboard/reports"
              className="flex items-center space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Reports</p>
                <p className="text-sm text-muted-foreground">Generate reports</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
