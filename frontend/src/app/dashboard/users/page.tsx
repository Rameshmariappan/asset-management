'use client'

import { useState, memo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useDepartments, useRoles } from '@/lib/api-hooks'
import { Users, Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { validatePassword } from '@/lib/password-validation'

const initialForm = { email: '', password: '', firstName: '', lastName: '', phone: '', departmentId: '', roleNames: '' }

const UserForm = memo(({ form, setForm, onSubmit, loading, isEdit, departments, roles }: any) => (
  <div className="grid gap-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2"><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
      <div className="space-y-2"><Label>Last Name *</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
    </div>
    <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
    {!isEdit && (
      <div className="space-y-2">
        <Label>Password *</Label>
        <Input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="Min 8 chars, uppercase, lowercase, number, special char"
        />
        <p className="text-xs text-muted-foreground">
          Must contain uppercase, lowercase, number, and special character (@$!%*?&)
        </p>
      </div>
    )}
    <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
    <div className="space-y-2">
      <Label>Department</Label>
      <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
        <SelectContent>
          {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    {!isEdit && (
      <div className="space-y-2">
        <Label>Role</Label>
        <Select value={form.roleNames} onValueChange={(v) => setForm({ ...form, roleNames: v })}>
          <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
          <SelectContent>
            {roles.map((r: any) => <SelectItem key={r.id} value={r.name}>{r.displayName || r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    )}
    <DialogFooter>
      <Button onClick={onSubmit} disabled={loading || !form.firstName || !form.lastName || !form.email || (!isEdit && !form.password)}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isEdit ? 'Update' : 'Create'}
      </Button>
    </DialogFooter>
  </div>
))

UserForm.displayName = 'UserForm'

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState(initialForm)

  const { data, isLoading } = useUsers({ page, limit: 20, search: search || undefined })
  const { data: departmentsData } = useDepartments()
  const { data: rolesData } = useRoles()
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const deleteMutation = useDeleteUser()

  const departments = departmentsData?.data || departmentsData || []
  const roles = rolesData?.data || rolesData || []

  const handleCreate = async () => {
    // Validate password
    const validation = validatePassword(form.password)
    if (!validation.isValid) {
      toast.error(validation.errors[0]) // Show first error
      return
    }

    try {
      await createMutation.mutateAsync({
        ...form,
        departmentId: form.departmentId || undefined,
        phone: form.phone || undefined,
        roleNames: form.roleNames ? [form.roleNames] : undefined,
      })
      toast.success('User created')
      setShowCreate(false)
      setForm(initialForm)
    } catch (error: any) {
      const errorMessage = error.response?.data?.message ||
                          error.response?.data?.error ||
                          error.message ||
                          'Failed to create user'
      toast.error(errorMessage)
      console.error('Create user error:', error)
    }
  }

  const handleEdit = (user: any) => {
    setSelected(user)
    setForm({
      email: user.email || '', password: '', firstName: user.firstName || '',
      lastName: user.lastName || '', phone: user.phone || '',
      departmentId: user.departmentId || '',
      roleNames: user.roles?.[0]?.name || '',
    })
    setShowEdit(true)
  }

  const handleUpdate = async () => {
    if (!selected) return
    try {
      const { password, roleNames, ...rest } = form
      await updateMutation.mutateAsync({
        id: selected.id,
        data: {
          ...rest,
          departmentId: rest.departmentId || undefined,
          phone: rest.phone || undefined,
        },
      })
      toast.success('User updated')
      setShowEdit(false)
      setSelected(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update user')
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    try {
      await deleteMutation.mutateAsync(selected.id)
      toast.success('User deleted')
      setShowDelete(false)
      setSelected(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user')
    }
  }

  const getRoleBadgeVariant = (roleName: string) => {
    if (roleName?.includes('ADMIN') || roleName?.includes('Super')) return 'destructive'
    if (roleName?.includes('MANAGER') || roleName?.includes('Manager')) return 'default'
    return 'secondary'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage system users and their roles</p>
        </div>
        <Button onClick={() => { setForm(initialForm); setSelected(null); setShowCreate(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-8" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 animate-pulse bg-gray-200 rounded" />)}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4 pb-2 border-b font-medium text-sm text-muted-foreground">
                <div className="col-span-3">Name</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Department</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-2">Actions</div>
              </div>
              {data?.data?.map((user: any) => {
                const roleName = user.roles?.[0]?.displayName || user.roles?.[0]?.name || 'N/A'
                return (
                  <div key={user.id} className="grid grid-cols-12 gap-4 items-center py-3 border-b hover:bg-accent/50 transition-colors">
                    <div className="col-span-3">
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      {!user.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                    </div>
                    <div className="col-span-3 text-sm text-muted-foreground">{user.email}</div>
                    <div className="col-span-2 text-sm">{user.department?.name || 'N/A'}</div>
                    <div className="col-span-2"><Badge variant={getRoleBadgeVariant(roleName)}>{roleName}</Badge></div>
                    <div className="col-span-2">
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(user)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setSelected(user); setShowDelete(true) }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {(!data?.data || data.data.length === 0) && (
                <div className="py-12 text-center text-muted-foreground"><Users className="mx-auto h-12 w-12 mb-4 opacity-50" /><p>No users found</p></div>
              )}
              {data?.meta && data.meta.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)</p>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= data.meta.totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent><DialogHeader><DialogTitle>Create User</DialogTitle><DialogDescription>Add a new user to the system.</DialogDescription></DialogHeader>
          <UserForm form={form} setForm={setForm} onSubmit={handleCreate} loading={createMutation.isPending} departments={departments} roles={roles} />
        </DialogContent>
      </Dialog>
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent><DialogHeader><DialogTitle>Edit User</DialogTitle><DialogDescription>Update user information.</DialogDescription></DialogHeader>
          <UserForm form={form} setForm={setForm} onSubmit={handleUpdate} loading={updateMutation.isPending} isEdit departments={departments} roles={roles} />
        </DialogContent>
      </Dialog>
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete User</DialogTitle><DialogDescription>Are you sure you want to delete {selected?.firstName} {selected?.lastName}?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
