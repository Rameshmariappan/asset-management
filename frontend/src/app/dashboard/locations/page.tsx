'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLocations } from '@/lib/api-hooks'
import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

export default function LocationsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useLocations({ page, limit: 20 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
        <p className="text-muted-foreground">
          Manage asset locations and facilities
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 animate-pulse bg-gray-200 rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {data?.data?.map((location: any) => (
                <div
                  key={location.id}
                  className="flex items-start space-x-4 rounded-lg border p-4"
                >
                  <MapPin className="h-8 w-8 text-primary mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{location.name}</h3>
                    {location.address && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {location.address}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {(!data?.data || data.data.length === 0) && (
                <div className="py-12 text-center text-muted-foreground">
                  <MapPin className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No locations found</p>
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
