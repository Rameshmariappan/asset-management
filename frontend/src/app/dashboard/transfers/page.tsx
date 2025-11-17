'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTransfers, useTransferStatistics } from '@/lib/api-hooks'
import { formatDateTime } from '@/lib/utils'
import { ArrowRightLeft, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function TransfersPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string | undefined>()

  const { data, isLoading } = useTransfers({ page, limit: 20, status })
  const { data: stats } = useTransferStatistics()

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'warning',
      manager_approved: 'default',
      admin_approved: 'default',
      completed: 'success',
      rejected: 'destructive',
    }
    return variants[status] || 'default'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending Manager Approval',
      manager_approved: 'Pending Admin Approval',
      admin_approved: 'Admin Approved',
      completed: 'Completed',
      rejected: 'Rejected',
    }
    return labels[status] || status
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transfers</h1>
          <p className="text-muted-foreground">
            Manage asset transfer requests and approvals
          </p>
        </div>
        <Button>
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Request Transfer
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalTransfers || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.pendingTransfers || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mgr Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.managerApprovedTransfers || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.completedTransfers || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.rejectedTransfers || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b">
        <button
          onClick={() => setStatus(undefined)}
          className={`px-4 py-2 font-medium transition-colors ${
            status === undefined
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All Transfers
        </button>
        <button
          onClick={() => setStatus('pending')}
          className={`px-4 py-2 font-medium transition-colors ${
            status === 'pending'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Pending ({stats?.pendingTransfers || 0})
        </button>
        <button
          onClick={() => setStatus('manager_approved')}
          className={`px-4 py-2 font-medium transition-colors ${
            status === 'manager_approved'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Awaiting Admin ({stats?.managerApprovedTransfers || 0})
        </button>
        <button
          onClick={() => setStatus('completed')}
          className={`px-4 py-2 font-medium transition-colors ${
            status === 'completed'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Transfers List */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-32 animate-pulse bg-gray-200 rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {data?.data?.map((transfer: any) => (
                <div
                  key={transfer.id}
                  className="rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold text-lg">
                        {transfer.asset.name}
                      </h3>
                      <Badge variant={getStatusBadgeVariant(transfer.status)}>
                        {getStatusLabel(transfer.status)}
                      </Badge>
                    </div>

                    {transfer.status === 'pending' && (
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          Approve (Manager)
                        </Button>
                        <Button variant="outline" size="sm">
                          Reject
                        </Button>
                      </div>
                    )}
                    {transfer.status === 'manager_approved' && (
                      <div className="flex space-x-2">
                        <Button size="sm">
                          Approve (Admin)
                        </Button>
                        <Button variant="outline" size="sm">
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-muted-foreground">Asset Tag</p>
                      <p className="font-mono font-medium">{transfer.asset.assetTag}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">From</p>
                      <p className="font-medium">
                        {transfer.fromUser
                          ? `${transfer.fromUser.firstName} ${transfer.fromUser.lastName}`
                          : 'Inventory'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">To</p>
                      <p className="font-medium">
                        {transfer.toUser.firstName} {transfer.toUser.lastName}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Requested By</p>
                      <p>
                        {transfer.requestedByUser.firstName}{' '}
                        {transfer.requestedByUser.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Requested Date</p>
                      <p>{formatDateTime(transfer.requestedAt)}</p>
                    </div>
                    {transfer.completedAt && (
                      <div>
                        <p className="text-muted-foreground">Completed Date</p>
                        <p>{formatDateTime(transfer.completedAt)}</p>
                      </div>
                    )}
                  </div>

                  {transfer.transferReason && (
                    <div className="mt-3 text-sm">
                      <p className="text-muted-foreground">Reason:</p>
                      <p className="italic">{transfer.transferReason}</p>
                    </div>
                  )}

                  {transfer.rejectionReason && (
                    <div className="mt-3 text-sm bg-red-50 p-2 rounded">
                      <p className="text-red-800 font-medium">Rejection Reason:</p>
                      <p className="text-red-700 italic">{transfer.rejectionReason}</p>
                    </div>
                  )}

                  {/* Approval Timeline */}
                  {(transfer.managerApprovedAt || transfer.adminApprovedAt) && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Approval Timeline
                      </p>
                      <div className="flex items-center space-x-4 text-xs">
                        {transfer.managerApprovedAt && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>
                              Manager: {formatDateTime(transfer.managerApprovedAt)}
                            </span>
                          </div>
                        )}
                        {transfer.adminApprovedAt && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>
                              Admin: {formatDateTime(transfer.adminApprovedAt)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {(!data?.data || data.data.length === 0) && (
                <div className="py-12 text-center text-muted-foreground">
                  <ArrowRightLeft className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No transfers found</p>
                  <p className="text-sm">
                    {status === 'pending' && 'No pending transfer requests'}
                    {status === 'manager_approved' && 'No transfers awaiting admin approval'}
                    {status === 'completed' && 'No completed transfers'}
                    {status === undefined && 'No transfer requests available'}
                  </p>
                </div>
              )}

              {/* Pagination */}
              {data?.meta && data.meta.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= data.meta.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
