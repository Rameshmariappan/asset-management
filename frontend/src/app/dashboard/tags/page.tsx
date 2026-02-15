'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTags } from '@/lib/api-hooks'
import { QrCode } from 'lucide-react'
import { useState } from 'react'
import { formatDateTime } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { EmptyState } from '@/components/empty-state'

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
      <PageHeader title="Tags" description="Manage NFC/RFID tags for asset tracking" />

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 animate-pulse bg-muted rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {data?.data?.map((tag: any) => (
                <div
                  key={tag.id}
                  className="flex items-start space-x-4 rounded-lg border p-4 transition-all duration-fast hover:shadow-card hover:border-border/80"
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
                <EmptyState icon={QrCode} title="No tags found" description="Tags will appear here once created for asset tracking." />
              )}
            </div>
          )}

          {data?.meta && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPageChange={setPage} />}
        </CardContent>
      </Card>
    </div>
  )
}
