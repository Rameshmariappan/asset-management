'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useUsers } from '@/lib/api-hooks'
import { User, Mail, Building2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

export default function UsersPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useUsers({ page, limit: 20 })

  const getRoleBadgeVariant = (role: string) => {
    const variants: Record<string, any> = {
      ADMIN: 'destructive',
      MANAGER: 'default',
      USER: 'secondary',
    }
    return variants[role] || 'default'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage users and their roles
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 animate-pulse bg-gray-200 rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {data?.data?.map((user: any) => (
                <div
                  key={user.id}
                  className="flex items-start space-x-4 rounded-lg border p-4"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <User className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {user.firstName} {user.lastName}
                        </h3>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {user.email}
                          </div>
                          {user.department && (
                            <div className="flex items-center">
                              <Building2 className="h-4 w-4 mr-1" />
                              {user.department.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}

              {(!data?.data || data.data.length === 0) && (
                <div className="py-12 text-center text-muted-foreground">
                  <User className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No users found</p>
                </div>
              )}
            </div>
          )}

          {data?.meta && data.meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {data.meta.page} of {data.meta.totalPages}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === data.meta.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
