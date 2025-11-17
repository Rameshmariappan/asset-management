'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTags } from '@/lib/api-hooks'
import { QrCode, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { formatDateTime } from '@/lib/utils'

export default function TagsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useTags({ page, limit: 20 })

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, any> = {
      active: 'success',
      assigned: 'default',
      damaged: 'destructive',
      lost: 'destructive',
    }
    return variants[status] || 'default'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
        <p className="text-muted-foreground">
          Manage NFC/RFID tags for asset tracking
        </p>
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
              {data?.data?.map((tag: any) => (
                <div
                  key={tag.id}
                  className="flex items-start space-x-4 rounded-lg border p-4"
                >
                  <QrCode className="h-8 w-8 text-primary mt-1" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold font-mono">{tag.tagId}</h3>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <p>Type: {tag.tagType}</p>
                          {tag.asset && (
                            <p>Assigned to: {tag.asset.name}</p>
                          )}
                          {tag.lastScanned && (
                            <p>Last Scanned: {formatDateTime(tag.lastScanned)}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={getStatusBadgeVariant(tag.status)}>
                        {tag.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}

              {(!data?.data || data.data.length === 0) && (
                <div className="py-12 text-center text-muted-foreground">
                  <QrCode className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No tags found</p>
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
