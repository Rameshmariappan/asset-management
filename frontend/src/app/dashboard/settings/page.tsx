'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-context'
import { usePermissions } from '@/lib/permissions'
import { useChangePassword, useUpdateOrganization, useUploadOrganizationLogo, useDeleteOrganizationLogo } from '@/lib/api-hooks'
import { Settings, User, Lock, Loader2, Mail, Building2, Upload, Trash2, Pencil, Check, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1').replace(/\/v1$/, '')

export default function SettingsPage() {
  const { user, updateOrganizationData } = useAuth()
  const { isAdmin } = usePermissions()
  const changePasswordMutation = useChangePassword()
  const updateOrgMutation = useUpdateOrganization()
  const uploadLogoMutation = useUploadOrganizationLogo()
  const deleteLogoMutation = useDeleteOrganizationLogo()

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [isEditingName, setIsEditingName] = useState(false)
  const [orgName, setOrgName] = useState(user?.organization?.name || '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const logoUrl = user?.organization?.logoUrl ? `${API_BASE}${user?.organization?.logoUrl}` : null

  const getInitials = (name: string) => {
    const words = name.trim().split(/\s+/)
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB')
      return
    }
    try {
      const result = await uploadLogoMutation.mutateAsync(file)
      updateOrganizationData({ logoUrl: result.logoUrl })
      toast.success('Logo uploaded successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload logo')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteLogo = async () => {
    try {
      await deleteLogoMutation.mutateAsync()
      updateOrganizationData({ logoUrl: null })
      toast.success('Logo removed')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove logo')
    }
  }

  const handleUpdateName = async () => {
    if (!orgName.trim() || orgName.trim().length < 2) {
      toast.error('Organization name must be at least 2 characters')
      return
    }
    try {
      const result = await updateOrgMutation.mutateAsync({ name: orgName.trim() })
      updateOrganizationData({ name: result.name })
      setIsEditingName(false)
      toast.success('Organization name updated')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update name')
    }
  }

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
              <CardDescription>Your organization details and branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Section */}
              <div className="space-y-3">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={user?.organization?.name || ''}
                        className="h-16 w-16 rounded-xl object-contain border border-border bg-muted/50"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted text-muted-foreground text-lg font-bold">
                        {getInitials(user?.organization?.name || '')}
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadLogoMutation.isPending}
                      >
                        {uploadLogoMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {logoUrl ? 'Change Logo' : 'Upload Logo'}
                      </Button>
                      {logoUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={handleDeleteLogo}
                          disabled={deleteLogoMutation.isPending}
                        >
                          {deleteLogoMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          Remove Logo
                        </Button>
                      )}
                      <p className="text-helper text-muted-foreground">PNG, JPG, SVG, or WebP. Max 2MB.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Name Section */}
              <div className="space-y-2">
                <Label>Organization Name</Label>
                {isAdmin && isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="max-w-xs"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateName(); if (e.key === 'Escape') { setIsEditingName(false); setOrgName(user?.organization?.name || '') } }}
                    />
                    <Button size="icon" variant="ghost" onClick={handleUpdateName} disabled={updateOrgMutation.isPending}>
                      {updateOrgMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setIsEditingName(false); setOrgName(user?.organization?.name || '') }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{user?.organization?.name}</span>
                    {isAdmin && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setOrgName(user?.organization?.name || ''); setIsEditingName(true) }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Slug (read-only) */}
              <div className="space-y-1">
                <Label>Slug</Label>
                <p className="text-sm font-medium text-muted-foreground">{user?.organization?.slug}</p>
              </div>

              {/* Invitations link */}
              {isAdmin && (
                <div className="pt-2">
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
