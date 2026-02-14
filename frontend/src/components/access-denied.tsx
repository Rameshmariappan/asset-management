'use client'

import { ShieldX } from 'lucide-react'

export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="flex h-96 items-center justify-center">
      <div className="max-w-md w-full rounded-lg border bg-card p-12 text-center shadow-sm">
        <ShieldX className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">
          {message ?? 'You do not have permission to view this page.'}
        </p>
      </div>
    </div>
  )
}
