'use client'

import { useState, memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '@/lib/api-hooks'
import { Building2, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { usePermissions } from '@/lib/permissions'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { EmptyState } from '@/components/empty-state'
import { ConfirmDialog } from '@/components/confirm-dialog'

const initialForm = { name: '', code: '' }

const DepartmentForm = memo(({ form, setForm, selected, onSubmit, loading }: {
  form: typeof initialForm;
  setForm: (form: typeof initialForm) => void;
  selected: any;
  onSubmit: () => void;
  loading: boolean
}) => (
  <div className="grid gap-4">
    <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Department name" /></div>
    <div className="space-y-2"><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. IT, HR, FIN" /></div>
    <DialogFooter>
      <Button onClick={onSubmit} disabled={loading || !form.name || !form.code}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{selected ? 'Update' : 'Create'}
      </Button>
    </DialogFooter>
  </div>
))

DepartmentForm.displayName = 'DepartmentForm'

export default function DepartmentsPage() {
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState(initialForm)

  const { data, isLoading } = useDepartments({ page, limit: 20 })
  const createMutation = useCreateDepartment()
  const updateMutation = useUpdateDepartment()
  const deleteMutation = useDeleteDepartment()
  const { canManageMasterData, canDeleteMasterData } = usePermissions()


  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync(form)
      toast.success('Department created')
      setShowCreate(false)
      setForm(initialForm)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create department')
    }
  }

  const handleEdit = (dept: any) => {
    setSelected(dept)
    setForm({ name: dept.name || '', code: dept.code || '' })
    setShowEdit(true)
  }

  const handleUpdate = async () => {
    if (!selected) return
    try {
      await updateMutation.mutateAsync({ id: selected.id, data: form })
      toast.success('Department updated')
      setShowEdit(false)
      setSelected(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update department')
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    try {
      await deleteMutation.mutateAsync(selected.id)
      toast.success('Department deleted')
      setShowDelete(false)
      setSelected(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete department')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Departments" description="Manage organization departments" action={canManageMasterData ? <Button onClick={() => { setForm(initialForm); setSelected(null); setShowCreate(true) }}><Plus className="mr-2 h-4 w-4" /> Add Department</Button> : undefined} />

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse bg-muted rounded" />)}</div>
          ) : (
            <div className="space-y-3">
              {data?.data?.map((dept: any) => (
                <div key={dept.id} className="flex items-center space-x-4 rounded-lg border p-4 transition-all duration-fast hover:shadow-card hover:border-border/80">
                  <Building2 className="h-8 w-8 text-primary" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{dept.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{dept.code}</p>
                    {dept.head && <p className="text-sm text-muted-foreground mt-1">Head: {dept.head.firstName} {dept.head.lastName}</p>}
                    <div className="flex space-x-4 mt-1 text-xs text-muted-foreground">
                      {dept._count?.users != null && <span>Users: {dept._count.users}</span>}
                      {dept._count?.children != null && dept._count.children > 0 && <span>Sub-depts: {dept._count.children}</span>}
                    </div>
                  </div>
                  {(canManageMasterData || canDeleteMasterData) && (
                  <div className="flex space-x-1">
                    {canManageMasterData && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(dept)}><Pencil className="h-4 w-4" /></Button>}
                    {canDeleteMasterData && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setSelected(dept); setShowDelete(true) }}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                  )}
                </div>
              ))}
              {(!data?.data || data.data.length === 0) && (
                <EmptyState icon={Building2} title="No departments created yet" description="Set up departments to organize your team." />
              )}
            </div>
          )}
          {data?.meta && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPageChange={setPage} />}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent><DialogHeader><DialogTitle>Create Department</DialogTitle><DialogDescription>Add a new department.</DialogDescription></DialogHeader>
          <DepartmentForm form={form} setForm={setForm} selected={selected} onSubmit={handleCreate} loading={createMutation.isPending} />
        </DialogContent>
      </Dialog>
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent><DialogHeader><DialogTitle>Edit Department</DialogTitle><DialogDescription>Update department details.</DialogDescription></DialogHeader>
          <DepartmentForm form={form} setForm={setForm} selected={selected} onSubmit={handleUpdate} loading={updateMutation.isPending} />
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={showDelete} onOpenChange={setShowDelete} title="Delete Department" description={`Are you sure you want to delete "${selected?.name}"? Departments with users cannot be deleted.`} confirmLabel="Delete" variant="destructive" onConfirm={handleDelete} isLoading={deleteMutation.isPending} />
    </div>
  )
}
