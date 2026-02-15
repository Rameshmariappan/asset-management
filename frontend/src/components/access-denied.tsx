'use client'

import { ShieldX } from 'lucide-react'

export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="flex h-96 items-center justify-center">
      <div className="max-w-md w-full rounded-xl border bg-card p-12 text-center shadow-card">
        <ShieldX className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-section-header mb-2">Access Denied</h2>
        <p className="text-body text-muted-foreground">
          {message ?? "You don't have permission to view this page. Contact your administrator if you believe this is an error."}
        </p>
      </div>
    </div>
  )
}
