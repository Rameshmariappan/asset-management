'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Organization {
  id: string
  name: string
  slug: string
  isActive: boolean
}

export function OrgSwitcher() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    fetchOrgs()
    const stored = sessionStorage.getItem('platform_selected_org_id')
    if (stored) setSelectedOrgId(stored)
  }, [])

  const fetchOrgs = async () => {
    try {
      const res = await apiClient.get('/platform/organizations')
      setOrgs(res.data)
    } catch {
      // Not a platform admin or error
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (value: string) => {
    const orgId = value === '__my_org__' ? '' : value
    setSelectedOrgId(orgId)
    if (orgId) {
      sessionStorage.setItem('platform_selected_org_id', orgId)
    } else {
      sessionStorage.removeItem('platform_selected_org_id')
    }
    queryClient.invalidateQueries()
  }

  if (loading || orgs.length === 0) return null

  return (
    <div className="px-3 py-2 border-b border-sidebar-border">
      <label className="block text-helper text-sidebar-muted mb-1.5">Viewing as org:</label>
      <Select value={selectedOrgId || '__my_org__'} onValueChange={handleChange}>
        <SelectTrigger className="h-8 text-[13px] bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
          <SelectValue placeholder="My Organization" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__my_org__">My Organization</SelectItem>
          {orgs.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
