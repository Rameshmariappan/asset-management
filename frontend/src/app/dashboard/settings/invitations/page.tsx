'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { usePermissions, ROLES } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/page-header'

interface Invitation {
  id: string
  email: string
  roleName: string
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
  token?: string
  invitedBy?: {
    firstName: string
    lastName: string
    email: string
  }
}

export default function InvitationsPage() {
  const { isAdmin } = usePermissions()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [roleName, setRoleName] = useState('EMPLOYEE')

  const { data: invitations = [], isLoading } = useQuery<Invitation[]>({
    queryKey: ['invitations'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations/invitations')
      return res.data
    },
    enabled: isAdmin,
  })

  const createMutation = useMutation({
    mutationFn: async (data: { email: string; roleName: string }) => {
      const res = await apiClient.post('/organizations/invitations', data)
      return res.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      setEmail('')
      if (data.token) {
        const link = `${window.location.origin}/auth/accept-invitation?token=${data.token}`
        navigator.clipboard.writeText(link).then(() => {
          toast.success('Invitation created! Link copied to clipboard.')
        }).catch(() => {
          toast.success('Invitation created!')
        })
      } else {
        toast.success('Invitation created!')
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create invitation')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/organizations/invitations/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      toast.success('Invitation revoked')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to revoke invitation')
    },
  })

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You do not have access to this page.</p>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    createMutation.mutate({ email, roleName })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Invitations" description="Invite users to your organization" backHref="/dashboard/settings" />

      <Card>
        <CardHeader>
          <CardTitle>Invite a User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="w-48 space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={roleName} onValueChange={setRoleName}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(ROLES).map((role) => (
                    <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={createMutation.isPending || !email}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invite
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : invitations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No invitations yet</p>
          ) : (
            <div className="divide-y">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{inv.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Role: {inv.roleName.replace(/_/g, ' ')} &middot;{' '}
                      {inv.acceptedAt
                        ? `Accepted ${new Date(inv.acceptedAt).toLocaleDateString()}`
                        : `Expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                      {inv.invitedBy && (
                        <> &middot; Invited by {inv.invitedBy.firstName} {inv.invitedBy.lastName}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {inv.acceptedAt ? (
                      <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Accepted</span>
                    ) : (
                      <>
                        {new Date(inv.expiresAt) < new Date() ? (
                          <span className="text-sm text-destructive font-medium">Expired</span>
                        ) : (
                          <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">Pending</span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeMutation.mutate(inv.id)}
                          disabled={revokeMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
