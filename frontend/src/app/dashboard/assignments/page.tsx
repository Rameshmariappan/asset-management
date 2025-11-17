'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAssignments, useAssignmentStatistics } from '@/lib/api-hooks'
import { formatDateTime } from '@/lib/utils'
import { UserCheck, Package, TrendingUp, AlertTriangle } from 'lucide-react'

export default function AssignmentsPage() {
  const [page, setPage] = useState(1)
  const [isActive, setIsActive] = useState<boolean | undefined>(true)

  const { data, isLoading } = useAssignments({ page, limit: 20, isActive })
  const { data: stats } = useAssignmentStatistics()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">
            Track and manage asset assignments
          </p>
        </div>
        <Button>
          <UserCheck className="mr-2 h-4 w-4" />
          New Assignment
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalAssignments || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.activeAssignments || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returned</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.returnedAssignments || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.overdueAssignments || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b">
        <button
          onClick={() => setIsActive(true)}
          className={`px-4 py-2 font-medium transition-colors ${
            isActive === true
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Active Assignments
        </button>
        <button
          onClick={() => setIsActive(false)}
          className={`px-4 py-2 font-medium transition-colors ${
            isActive === false
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Returned
        </button>
        <button
          onClick={() => setIsActive(undefined)}
          className={`px-4 py-2 font-medium transition-colors ${
            isActive === undefined
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All
        </button>
      </div>

      {/* Assignments List */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 animate-pulse bg-gray-200 rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {data?.data?.map((assignment: any) => (
                <div
                  key={assignment.id}
                  className="rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {assignment.asset.name}
                        </h3>
                        <Badge variant={assignment.isActive ? 'default' : 'secondary'}>
                          {assignment.isActive ? 'Active' : 'Returned'}
                        </Badge>
                        {assignment.assignCondition && (
                          <Badge variant="outline">
                            {assignment.assignCondition}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Asset Tag</p>
                          <p className="font-mono font-medium">
                            {assignment.asset.assetTag}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Assigned To</p>
                          <p className="font-medium">
                            {assignment.assignedToUser.firstName}{' '}
                            {assignment.assignedToUser.lastName}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Assigned Date</p>
                          <p>{formatDateTime(assignment.assignedAt)}</p>
                        </div>
                        {assignment.expectedReturnDate && (
                          <div>
                            <p className="text-muted-foreground">Expected Return</p>
                            <p>{formatDateTime(assignment.expectedReturnDate)}</p>
                          </div>
                        )}
                        {assignment.returnedAt && (
                          <div>
                            <p className="text-muted-foreground">Returned Date</p>
                            <p>{formatDateTime(assignment.returnedAt)}</p>
                          </div>
                        )}
                        {assignment.returnCondition && (
                          <div>
                            <p className="text-muted-foreground">Return Condition</p>
                            <Badge variant="outline">
                              {assignment.returnCondition}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {assignment.assignNotes && (
                        <div className="mt-3 text-sm">
                          <p className="text-muted-foreground">Notes:</p>
                          <p className="italic">{assignment.assignNotes}</p>
                        </div>
                      )}
                    </div>

                    {assignment.isActive && (
                      <Button variant="outline" size="sm">
                        Return Asset
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {(!data?.data || data.data.length === 0) && (
                <div className="py-12 text-center text-muted-foreground">
                  <UserCheck className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No assignments found</p>
                  <p className="text-sm">
                    {isActive === true && 'No active assignments at the moment'}
                    {isActive === false && 'No returned assignments found'}
                    {isActive === undefined && 'No assignments available'}
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
