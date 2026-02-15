'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-context'
import { usePermissions } from '@/lib/permissions'
import { useChangePassword } from '@/lib/api-hooks'
import { Settings, User, Lock, Loader2, Mail, Building2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'

export default function SettingsPage() {
  const { user } = useAuth()
  const { isAdmin } = usePermissions()
  const changePasswordMutation = useChangePassword()

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      toast.success('Password updated successfully')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update password')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account settings and preferences" />

      <div className="grid gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2"><User className="h-5 w-5" /><span>Profile Information</span></CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>First Name</Label><Input value={user?.firstName || ''} disabled /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input value={user?.lastName || ''} disabled /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ''} disabled /></div>
            <p className="text-xs text-muted-foreground">Contact an administrator to update your profile information.</p>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2"><Lock className="h-5 w-5" /><span>Change Password</span></CardTitle>
            <CardDescription>Update your password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} placeholder="Min 8 characters" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
            </div>
            <Button onClick={handleChangePassword} disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}>
              {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* Organization */}
        {user?.organization && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2"><Building2 className="h-5 w-5" /><span>Organization</span></CardTitle>
              <CardDescription>Your organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Name:</span><span className="font-medium">{user.organization.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Slug:</span><span className="font-medium">{user.organization.slug}</span></div>
              {isAdmin && (
                <div className="pt-3">
                  <Link href="/dashboard/settings/invitations">
                    <Button variant="outline" size="sm">
                      <Mail className="mr-2 h-4 w-4" />
                      Manage Invitations
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2"><Settings className="h-5 w-5" /><span>System Information</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Role:</span><span className="font-medium">{(() => { const r = user?.roles?.[0]; return typeof r === 'string' ? r : r?.displayName || r?.name || 'N/A' })()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Department:</span><span className="font-medium">{user?.department?.name || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Account Status:</span><span className="font-medium">Active</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
