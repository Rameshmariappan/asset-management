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
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from '@/lib/api-hooks'
import { Store, Mail, Phone, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const initialForm = { name: '', code: '', email: '', phone: '', website: '', address: '', contactPerson: '', taxId: '' }

const VendorForm = memo(({
  form,
  setForm,
  selected,
  onSubmit,
  loading
}: {
  form: typeof initialForm;
  setForm: (form: typeof initialForm) => void;
  selected: any;
  onSubmit: () => void;
  loading: boolean
}) => (
  <div className="grid gap-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div className="space-y-2"><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. VND-001" /></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2"><Label>Contact Person</Label><Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div>
      <div className="space-y-2"><Label>Tax ID</Label><Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} /></div>
    </div>
    <div className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
    <div className="space-y-2"><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
    <DialogFooter>
      <Button onClick={onSubmit} disabled={loading || !form.name || !form.code}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{selected ? 'Update' : 'Create'}
      </Button>
    </DialogFooter>
  </div>
))
VendorForm.displayName = 'VendorForm'

export default function VendorsPage() {
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState(initialForm)

  const { data, isLoading } = useVendors({ page, limit: 20 })
  const createMutation = useCreateVendor()
  const updateMutation = useUpdateVendor()
  const deleteMutation = useDeleteVendor()

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({
        ...form,
        email: form.email || undefined,
        phone: form.phone || undefined,
        website: form.website || undefined,
        address: form.address || undefined,
        contactPerson: form.contactPerson || undefined,
        taxId: form.taxId || undefined,
      })
      toast.success('Vendor created')
      setShowCreate(false)
      setForm(initialForm)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create vendor')
    }
  }

  const handleEdit = (vendor: any) => {
    setSelected(vendor)
    setForm({
      name: vendor.name || '', code: vendor.code || '', email: vendor.email || '',
      phone: vendor.phone || '', website: vendor.website || '', address: vendor.address || '',
      contactPerson: vendor.contactPerson || '', taxId: vendor.taxId || '',
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
          email: form.email || undefined,
          phone: form.phone || undefined,
          website: form.website || undefined,
          address: form.address || undefined,
          contactPerson: form.contactPerson || undefined,
          taxId: form.taxId || undefined,
        },
      })
      toast.success('Vendor updated')
      setShowEdit(false)
      setSelected(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update vendor')
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    try {
      await deleteMutation.mutateAsync(selected.id)
      toast.success('Vendor deleted')
      setShowDelete(false)
      setSelected(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete vendor')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">Manage vendors and suppliers</p>
        </div>
        <Button onClick={() => { setForm(initialForm); setSelected(null); setShowCreate(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Add Vendor
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 animate-pulse bg-gray-200 rounded" />)}</div>
          ) : (
            <div className="space-y-3">
              {data?.data?.map((vendor: any) => (
                <div key={vendor.id} className="flex items-start space-x-4 rounded-lg border p-4">
                  <Store className="h-8 w-8 text-primary mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{vendor.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{vendor.code}</p>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {vendor.contactPerson && <p>Contact: {vendor.contactPerson}</p>}
                      {vendor.email && <div className="flex items-center"><Mail className="h-4 w-4 mr-1" />{vendor.email}</div>}
                      {vendor.phone && <div className="flex items-center"><Phone className="h-4 w-4 mr-1" />{vendor.phone}</div>}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(vendor)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setSelected(vendor); setShowDelete(true) }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {(!data?.data || data.data.length === 0) && (
                <div className="py-12 text-center text-muted-foreground"><Store className="mx-auto h-12 w-12 mb-4 opacity-50" /><p>No vendors found</p></div>
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
        <DialogContent><DialogHeader><DialogTitle>Create Vendor</DialogTitle><DialogDescription>Add a new vendor/supplier.</DialogDescription></DialogHeader>
          <VendorForm form={form} setForm={setForm} selected={selected} onSubmit={handleCreate} loading={createMutation.isPending} />
        </DialogContent>
      </Dialog>
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent><DialogHeader><DialogTitle>Edit Vendor</DialogTitle><DialogDescription>Update vendor details.</DialogDescription></DialogHeader>
          <VendorForm form={form} setForm={setForm} selected={selected} onSubmit={handleUpdate} loading={updateMutation.isPending} />
        </DialogContent>
      </Dialog>
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Vendor</DialogTitle><DialogDescription>Are you sure you want to delete &quot;{selected?.name}&quot;?</DialogDescription></DialogHeader>
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
