'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useVendors } from '@/lib/api-hooks'
import { Store, Mail, Phone, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

export default function VendorsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useVendors({ page, limit: 20 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
        <p className="text-muted-foreground">
          Manage vendors and suppliers
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 animate-pulse bg-gray-200 rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {data?.data?.map((vendor: any) => (
                <div
                  key={vendor.id}
                  className="flex items-start space-x-4 rounded-lg border p-4"
                >
                  <Store className="h-8 w-8 text-primary mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{vendor.name}</h3>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {vendor.contactPerson && (
                        <p>Contact: {vendor.contactPerson}</p>
                      )}
                      {vendor.email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {vendor.email}
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1" />
                          {vendor.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {(!data?.data || data.data.length === 0) && (
                <div className="py-12 text-center text-muted-foreground">
                  <Store className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No vendors found</p>
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
