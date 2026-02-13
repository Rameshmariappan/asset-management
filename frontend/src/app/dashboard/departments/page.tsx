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
import { Building2, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground">Manage organization departments</p>
        </div>
        <Button onClick={() => { setForm(initialForm); setSelected(null); setShowCreate(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Add Department
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse bg-gray-200 rounded" />)}</div>
          ) : (
            <div className="space-y-3">
              {data?.data?.map((dept: any) => (
                <div key={dept.id} className="flex items-center space-x-4 rounded-lg border p-4">
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
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(dept)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setSelected(dept); setShowDelete(true) }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {(!data?.data || data.data.length === 0) && (
                <div className="py-12 text-center text-muted-foreground"><Building2 className="mx-auto h-12 w-12 mb-4 opacity-50" /><p>No departments found</p></div>
              )}
            </div>
          )}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Page {data.meta.page} of {data.meta.totalPages}</div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page === data.meta.totalPages}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </div>
          )}
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
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Department</DialogTitle><DialogDescription>Are you sure you want to delete &quot;{selected?.name}&quot;? Departments with users cannot be deleted.</DialogDescription></DialogHeader>
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
