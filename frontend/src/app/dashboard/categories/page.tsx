'use client'

import { useState, memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/lib/api-hooks'
import { FolderTree, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const initialForm = { name: '', code: '', description: '', icon: '', depreciationRate: '', usefulLifeYears: '' }

const CategoryForm = memo(({
  form,
  setForm,
  selected,
  onSubmit,
  loading
}: {
  form: typeof initialForm;
  setForm: React.Dispatch<React.SetStateAction<typeof initialForm>>;
  selected: any;
  onSubmit: () => void;
  loading: boolean;
}) => (
  <div className="grid gap-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Category name" />
      </div>
      <div className="space-y-2">
        <Label>Code *</Label>
        <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. IT-HW" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Depreciation Rate (%)</Label>
        <Input type="number" min="0" max="100" step="0.1" value={form.depreciationRate} onChange={(e) => setForm({ ...form, depreciationRate: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Useful Life (years)</Label>
        <Input type="number" min="1" value={form.usefulLifeYears} onChange={(e) => setForm({ ...form, usefulLifeYears: e.target.value })} />
      </div>
    </div>
    <div className="space-y-2">
      <Label>Icon</Label>
      <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Icon name" />
    </div>
    <div className="space-y-2">
      <Label>Description</Label>
      <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
    </div>
    <DialogFooter>
      <Button onClick={onSubmit} disabled={loading || !form.name || !form.code}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {selected ? 'Update' : 'Create'}
      </Button>
    </DialogFooter>
  </div>
))

CategoryForm.displayName = 'CategoryForm'

export default function CategoriesPage() {
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState(initialForm)

  const { data, isLoading } = useCategories({ page, limit: 20 })
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({
        ...form,
        depreciationRate: form.depreciationRate ? parseFloat(form.depreciationRate) : undefined,
        usefulLifeYears: form.usefulLifeYears ? parseInt(form.usefulLifeYears) : undefined,
        description: form.description || undefined,
        icon: form.icon || undefined,
      })
      toast.success('Category created')
      setShowCreate(false)
      setForm(initialForm)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create category')
    }
  }

  const handleEdit = (cat: any) => {
    setSelected(cat)
    setForm({
      name: cat.name || '', code: cat.code || '', description: cat.description || '',
      icon: cat.icon || '', depreciationRate: cat.depreciationRate?.toString() || '',
      usefulLifeYears: cat.usefulLifeYears?.toString() || '',
    })
    setShowEdit(true)
  }

  const handleUpdate = async () => {
    if (!selected) return
    try {
      await updateMutation.mutateAsync({
        id: selected.id,
        data: {
          ...form,
          depreciationRate: form.depreciationRate ? parseFloat(form.depreciationRate) : undefined,
          usefulLifeYears: form.usefulLifeYears ? parseInt(form.usefulLifeYears) : undefined,
          description: form.description || undefined,
          icon: form.icon || undefined,
        },
      })
      toast.success('Category updated')
      setShowEdit(false)
      setSelected(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update category')
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    try {
      await deleteMutation.mutateAsync(selected.id)
      toast.success('Category deleted')
      setShowDelete(false)
      setSelected(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete category')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Manage asset categories and classifications</p>
        </div>
        <Button onClick={() => { setForm(initialForm); setSelected(null); setShowCreate(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse bg-gray-200 rounded" />)}</div>
          ) : (
            <div className="space-y-3">
              {data?.data?.map((category: any) => (
                <div key={category.id} className="flex items-center space-x-4 rounded-lg border p-4">
                  <FolderTree className="h-8 w-8 text-primary" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{category.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{category.code}</p>
                    {category.description && <p className="text-sm text-muted-foreground mt-1">{category.description}</p>}
                    <div className="flex space-x-4 mt-1 text-xs text-muted-foreground">
                      {category.depreciationRate != null && <span>Depreciation: {category.depreciationRate}%</span>}
                      {category.usefulLifeYears != null && <span>Useful life: {category.usefulLifeYears} yrs</span>}
                      {category._count?.assets != null && <span>Assets: {category._count.assets}</span>}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(category)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setSelected(category); setShowDelete(true) }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {(!data?.data || data.data.length === 0) && (
                <div className="py-12 text-center text-muted-foreground">
                  <FolderTree className="mx-auto h-12 w-12 mb-4 opacity-50" /><p>No categories found</p>
                </div>
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
        <DialogContent><DialogHeader><DialogTitle>Create Category</DialogTitle><DialogDescription>Add a new asset category.</DialogDescription></DialogHeader>
          <CategoryForm form={form} setForm={setForm} selected={selected} onSubmit={handleCreate} loading={createMutation.isPending} />
        </DialogContent>
      </Dialog>
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent><DialogHeader><DialogTitle>Edit Category</DialogTitle><DialogDescription>Update category details.</DialogDescription></DialogHeader>
          <CategoryForm form={form} setForm={setForm} selected={selected} onSubmit={handleUpdate} loading={updateMutation.isPending} />
        </DialogContent>
      </Dialog>
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>Are you sure you want to delete &quot;{selected?.name}&quot;? Categories with assets cannot be deleted.</DialogDescription>
          </DialogHeader>
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
