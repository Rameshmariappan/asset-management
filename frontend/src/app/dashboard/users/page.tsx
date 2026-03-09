'use client'

import { useState, memo } from 'react'
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
import { usePermissions } from '@/lib/permissions'
import { AccessDenied } from '@/components/access-denied'
import { PageHeader } from '@/components/page-header'
import { DataTable, type Column } from '@/components/data-table'
import { ConfirmDialog } from '@/components/confirm-dialog'

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
        <p className="text-helper text-muted-foreground">
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
  const { canViewUserList, canManageUsers, canCreateUsers, canEditUsers } = usePermissions()
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
    const validation = validatePassword(form.password)
    if (!validation.isValid) {
      toast.error(validation.errors[0])
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
      toast.error(error.response?.data?.message || error.message || 'Failed to create user')
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

  const handleDeleteConfirm = async () => {
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

  if (!canViewUserList) {
    return <AccessDenied />
  }

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (user) => (
        <div>
          <span className="font-medium">{user.firstName} {user.lastName}</span>
          {!user.isActive && <Badge variant="secondary" className="ml-2 text-[11px]">Inactive</Badge>}
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      cell: (user) => <span className="text-muted-foreground">{user.email}</span>,
    },
    {
      key: 'department',
      header: 'Department',
      cell: (user) => user.department?.name || 'N/A',
    },
    {
      key: 'role',
      header: 'Role',
      cell: (user) => {
        const roleName = user.roles?.[0]?.displayName || user.roles?.[0]?.name || 'N/A'
        return <Badge variant={getRoleBadgeVariant(roleName)}>{roleName}</Badge>
      },
    },
    ...((canEditUsers || canManageUsers) ? [{
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (user: any) => (
        <div className="flex items-center justify-end gap-1">
          {canEditUsers && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(user) }}><Pencil className="h-4 w-4" /></Button>}
          {canManageUsers && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setSelected(user); setShowDelete(true) }}><Trash2 className="h-4 w-4" /></Button>}
        </div>
      ),
    }] : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage system users and their roles"
        action={canCreateUsers ? (
          <Button onClick={() => { setForm(initialForm); setSelected(null); setShowCreate(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        ) : undefined}
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        emptyIcon={Users}
        emptyTitle="No users registered yet"
        emptyDescription="Add users to manage access and assignments."
        page={data?.meta?.page || page}
        totalPages={data?.meta?.totalPages || 1}
        total={data?.meta?.total}
        onPageChange={setPage}
      />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create User</DialogTitle><DialogDescription>Add a new user to the system.</DialogDescription></DialogHeader>
          <UserForm form={form} setForm={setForm} onSubmit={handleCreate} loading={createMutation.isPending} departments={departments} roles={roles} />
        </DialogContent>
      </Dialog>
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle><DialogDescription>Update user information.</DialogDescription></DialogHeader>
          <UserForm form={form} setForm={setForm} onSubmit={handleUpdate} loading={updateMutation.isPending} isEdit departments={departments} roles={roles} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete User"
        description={`Are you sure you want to delete ${selected?.firstName} ${selected?.lastName}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
