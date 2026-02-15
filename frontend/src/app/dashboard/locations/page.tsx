'use client'

import { useState, memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from '@/lib/api-hooks'
import { MapPin, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { usePermissions } from '@/lib/permissions'
import { AccessDenied } from '@/components/access-denied'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { EmptyState } from '@/components/empty-state'
import { ConfirmDialog } from '@/components/confirm-dialog'

const LOCATION_TYPES = ['office', 'warehouse', 'remote', 'data_center', 'branch', 'other']
const initialForm = { name: '', code: '', type: '', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: '', latitude: '', longitude: '' }

const LocationForm = memo(({ form, setForm, onSubmit, loading, selected }: { form: any; setForm: (form: any) => void; onSubmit: () => void; loading: boolean; selected: any }) => (
  <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div className="space-y-2"><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. LOC-001" /></div>
    </div>
    <div className="space-y-2">
      <Label>Type</Label>
      <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
        <SelectContent>
          {LOCATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-2"><Label>Address Line 1</Label><Input value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} /></div>
    <div className="space-y-2"><Label>Address Line 2</Label><Input value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} /></div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
      <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2"><Label>Postal Code</Label><Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></div>
      <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2"><Label>Latitude</Label><Input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></div>
      <div className="space-y-2"><Label>Longitude</Label><Input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></div>
    </div>
    <DialogFooter>
      <Button onClick={onSubmit} disabled={loading || !form.name || !form.code}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{selected ? 'Update' : 'Create'}
      </Button>
    </DialogFooter>
  </div>
))
LocationForm.displayName = 'LocationForm'

export default function LocationsPage() {
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState(initialForm)

  const { data, isLoading } = useLocations({ page, limit: 20 })
  const createMutation = useCreateLocation()
  const updateMutation = useUpdateLocation()
  const deleteMutation = useDeleteLocation()
  const { canManageMasterData } = usePermissions()

  if (!canManageMasterData) return <AccessDenied />

  const cleanForm = () => ({
    ...form,
    type: form.type || undefined,
    addressLine1: form.addressLine1 || undefined, addressLine2: form.addressLine2 || undefined,
    city: form.city || undefined, state: form.state || undefined,
    postalCode: form.postalCode || undefined, country: form.country || undefined,
    latitude: form.latitude ? parseFloat(form.latitude) : undefined,
    longitude: form.longitude ? parseFloat(form.longitude) : undefined,
  })

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync(cleanForm())
      toast.success('Location created')
      setShowCreate(false)
      setForm(initialForm)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create location')
    }
  }

  const handleEdit = (loc: any) => {
    setSelected(loc)
    setForm({
      name: loc.name || '', code: loc.code || '', type: loc.type || '',
      addressLine1: loc.addressLine1 || '', addressLine2: loc.addressLine2 || '',
      city: loc.city || '', state: loc.state || '', postalCode: loc.postalCode || '',
      country: loc.country || '', latitude: loc.latitude?.toString() || '',
      longitude: loc.longitude?.toString() || '',
    })
    setShowEdit(true)
  }

  const handleUpdate = async () => {
    if (!selected) return
    try {
      await updateMutation.mutateAsync({ id: selected.id, data: cleanForm() })
      toast.success('Location updated')
      setShowEdit(false)
      setSelected(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update location')
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    try {
      await deleteMutation.mutateAsync(selected.id)
      toast.success('Location deleted')
      setShowDelete(false)
      setSelected(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete location')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Locations" description="Manage physical locations" action={<Button onClick={() => { setForm(initialForm); setSelected(null); setShowCreate(true) }}><Plus className="mr-2 h-4 w-4" /> Add Location</Button>} />

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse bg-muted rounded" />)}</div>
          ) : (
            <div className="space-y-3">
              {data?.data?.map((location: any) => (
                <div key={location.id} className="flex items-start space-x-4 rounded-lg border p-4 transition-all duration-fast hover:shadow-card hover:border-border/80">
                  <MapPin className="h-8 w-8 text-primary mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{location.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{location.code}</p>
                    {location.type && <p className="text-xs text-muted-foreground capitalize mt-1">{location.type.replace('_', ' ')}</p>}
                    {(location.addressLine1 || location.city) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {[location.addressLine1, location.city, location.state, location.country].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(location)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setSelected(location); setShowDelete(true) }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {(!data?.data || data.data.length === 0) && (
                <EmptyState icon={MapPin} title="No locations defined yet" description="Add a location to track where assets are." />
              )}
            </div>
          )}
          {data?.meta && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPageChange={setPage} />}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Create Location</DialogTitle><DialogDescription>Add a new physical location.</DialogDescription></DialogHeader>
          <LocationForm form={form} setForm={setForm} onSubmit={handleCreate} loading={createMutation.isPending} selected={selected} />
        </DialogContent>
      </Dialog>
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Edit Location</DialogTitle><DialogDescription>Update location details.</DialogDescription></DialogHeader>
          <LocationForm form={form} setForm={setForm} onSubmit={handleUpdate} loading={updateMutation.isPending} selected={selected} />
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={showDelete} onOpenChange={setShowDelete} title="Delete Location" description={`Are you sure you want to delete "${selected?.name}"?`} confirmLabel="Delete" variant="destructive" onConfirm={handleDelete} isLoading={deleteMutation.isPending} />
    </div>
  )
}
