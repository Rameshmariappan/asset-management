'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'

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

  const handleChange = (orgId: string) => {
    setSelectedOrgId(orgId)
    if (orgId) {
      sessionStorage.setItem('platform_selected_org_id', orgId)
    } else {
      sessionStorage.removeItem('platform_selected_org_id')
    }
    // Invalidate all queries to refetch with new org context
    queryClient.invalidateQueries()
  }

  if (loading || orgs.length === 0) return null

  return (
    <div className="px-4 py-2 border-b border-gray-800">
      <label className="block text-xs text-gray-500 mb-1">Viewing as org:</label>
      <select
        value={selectedOrgId}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full bg-gray-800 text-gray-200 text-sm rounded px-2 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">My Organization</option>
        {orgs.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </div>
  )
}
