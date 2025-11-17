'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAssets } from '@/lib/api-hooks'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Search, Eye, Pencil, Trash2 } from 'lucide-react'

export default function AssetsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useAssets({
    page,
    limit: 20,
    search: search || undefined,
  })

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground">
            Manage your organization's assets
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 animate-pulse bg-gray-200 rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 pb-2 border-b font-medium text-sm text-muted-foreground">
                <div className="col-span-2">Asset Tag</div>
                <div className="col-span-3">Name</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Value</div>
                <div className="col-span-1">Actions</div>
              </div>

              {/* Table Body */}
              {data?.data?.map((asset: any) => (
                <div
                  key={asset.id}
                  className="grid grid-cols-12 gap-4 items-center py-3 border-b hover:bg-accent/50 transition-colors"
                >
                  <div className="col-span-2 font-mono text-sm font-medium">
                    {asset.assetTag}
                  </div>
                  <div className="col-span-3">
                    <p className="font-medium">{asset.name}</p>
                    {asset.serialNumber && (
                      <p className="text-xs text-muted-foreground">
                        SN: {asset.serialNumber}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 text-sm">
                    {asset.category?.name || 'N/A'}
                  </div>
                  <div className="col-span-2">
                    <Badge variant={getStatusBadgeVariant(asset.status)}>
                      {asset.status}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-sm">
                    {formatCurrency(asset.currentValue || asset.purchaseCost)}
                  </div>
                  <div className="col-span-1">
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {(!data?.data || data.data.length === 0) && (
                <div className="py-12 text-center text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No assets found</p>
                  <p className="text-sm">Try adjusting your search or add a new asset</p>
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

function Package({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}
