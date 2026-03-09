'use client'

import { useState, memo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useAssets,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useCategories,
  useVendors,
  useLocations,
} from '@/lib/api-hooks'
import { formatCurrency } from '@/lib/utils'
import { Plus, Search, Eye, Pencil, Trash2, Loader2, Package } from 'lucide-react'
import { toast } from 'sonner'
import { usePermissions } from '@/lib/permissions'
import { PageHeader } from '@/components/page-header'
import { DataTable, type Column } from '@/components/data-table'
import { ConfirmDialog } from '@/components/confirm-dialog'

const ASSET_STATUSES = ['available', 'assigned', 'maintenance', 'damaged', 'retired']

const initialFormData = {
  assetTag: '',
  name: '',
  serialNumber: '',
  description: '',
  model: '',
  manufacturer: '',
  categoryId: '',
  vendorId: '',
  locationId: '',
  status: 'available',
  purchaseDate: '',
  purchaseCost: '',
  currency: 'USD',
  salvageValue: '',
  warrantyEndDate: '',
  warrantyDetails: '',
  invoiceNumber: '',
  notes: '',
}

const AssetForm = memo(({
  form,
  setForm,
  categories,
  vendors,
  locations,
  selectedAsset,
  onSubmit,
  isLoading: submitting
}: {
  form: typeof initialFormData;
  setForm: (form: typeof initialFormData) => void;
  categories: any[];
  vendors: any[];
  locations: any[];
  selectedAsset: any;
  onSubmit: () => void;
  isLoading: boolean;
}) => (
  <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="assetTag">Asset Tag *</Label>
        <Input id="assetTag" value={form.assetTag} onChange={(e) => setForm({ ...form, assetTag: e.target.value })} placeholder="e.g. AST-001" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Asset name" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="serialNumber">Serial Number</Label>
        <Input id="serialNumber" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Input id="model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="manufacturer">Manufacturer</Label>
        <Input id="manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Status *</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ASSET_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label>Category *</Label>
        <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {categories.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Vendor *</Label>
        <Select value={form.vendorId} onValueChange={(v) => setForm({ ...form, vendorId: v })}>
          <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
          <SelectContent>
            {vendors.map((v: any) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Location *</Label>
        <Select value={form.locationId} onValueChange={(v) => setForm({ ...form, locationId: v })}>
          <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
          <SelectContent>
            {locations.map((l: any) => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="purchaseDate">Purchase Date *</Label>
        <Input id="purchaseDate" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="purchaseCost">Purchase Cost *</Label>
        <Input id="purchaseCost" type="number" min="0" step="0.01" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="salvageValue">Salvage Value</Label>
        <Input id="salvageValue" type="number" min="0" step="0.01" value={form.salvageValue} onChange={(e) => setForm({ ...form, salvageValue: e.target.value })} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="warrantyEndDate">Warranty End Date</Label>
        <Input id="warrantyEndDate" type="date" value={form.warrantyEndDate} onChange={(e) => setForm({ ...form, warrantyEndDate: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invoiceNumber">Invoice Number</Label>
        <Input id="invoiceNumber" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
      </div>
    </div>
    <div className="space-y-2">
      <Label htmlFor="description">Description</Label>
      <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
    </div>
    <div className="space-y-2">
      <Label htmlFor="notes">Notes</Label>
      <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
    </div>
    <DialogFooter>
      <Button onClick={onSubmit} disabled={submitting || !form.assetTag || !form.name || !form.categoryId || !form.vendorId || !form.locationId || !form.purchaseDate || !form.purchaseCost}>
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {selectedAsset ? 'Update Asset' : 'Create Asset'}
      </Button>
    </DialogFooter>
  </div>
))

AssetForm.displayName = 'AssetForm'

export default function AssetsPage() {
  const { canManageAssets, canDeleteAssets } = usePermissions()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const [formData, setFormData] = useState(initialFormData)

  const { data, isLoading } = useAssets({ page, limit: 20, search: search || undefined })
  const { data: categoriesData } = useCategories()
  const { data: vendorsData } = useVendors()
  const { data: locationsData } = useLocations()

  const createMutation = useCreateAsset()
  const updateMutation = useUpdateAsset()
  const deleteMutation = useDeleteAsset()

  const categories = categoriesData?.data || categoriesData || []
  const vendors = vendorsData?.data || vendorsData || []
  const locations = locationsData?.data || locationsData || []

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, any> = {
      available: 'success',
      assigned: 'default',
      maintenance: 'warning',
      damaged: 'destructive',
      retired: 'secondary',
    }
    return variants[status] || 'default'
  }

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({
        ...formData,
        purchaseCost: parseFloat(formData.purchaseCost) || 0,
        salvageValue: formData.salvageValue ? parseFloat(formData.salvageValue) : undefined,
        warrantyEndDate: formData.warrantyEndDate || undefined,
        warrantyDetails: formData.warrantyDetails || undefined,
        invoiceNumber: formData.invoiceNumber || undefined,
        serialNumber: formData.serialNumber || undefined,
        description: formData.description || undefined,
        model: formData.model || undefined,
        manufacturer: formData.manufacturer || undefined,
        notes: formData.notes || undefined,
      })
      toast.success('Asset created successfully')
      setShowCreateDialog(false)
      setFormData(initialFormData)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create asset')
    }
  }

  const handleEdit = (asset: any) => {
    setSelectedAsset(asset)
    setFormData({
      assetTag: asset.assetTag || '',
      name: asset.name || '',
      serialNumber: asset.serialNumber || '',
      description: asset.description || '',
      model: asset.model || '',
      manufacturer: asset.manufacturer || '',
      categoryId: asset.categoryId || '',
      vendorId: asset.vendorId || '',
      locationId: asset.locationId || '',
      status: asset.status || 'available',
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
      purchaseCost: asset.purchaseCost?.toString() || '',
      currency: asset.currency || 'USD',
      salvageValue: asset.salvageValue?.toString() || '',
      warrantyEndDate: asset.warrantyEndDate ? asset.warrantyEndDate.split('T')[0] : '',
      warrantyDetails: asset.warrantyDetails || '',
      invoiceNumber: asset.invoiceNumber || '',
      notes: asset.notes || '',
    })
    setShowEditDialog(true)
  }

  const handleUpdate = async () => {
    if (!selectedAsset) return
    try {
      await updateMutation.mutateAsync({
        id: selectedAsset.id,
        data: {
          ...formData,
          purchaseCost: parseFloat(formData.purchaseCost) || 0,
          salvageValue: formData.salvageValue ? parseFloat(formData.salvageValue) : undefined,
          warrantyEndDate: formData.warrantyEndDate || undefined,
          warrantyDetails: formData.warrantyDetails || undefined,
          invoiceNumber: formData.invoiceNumber || undefined,
          serialNumber: formData.serialNumber || undefined,
          description: formData.description || undefined,
          model: formData.model || undefined,
          manufacturer: formData.manufacturer || undefined,
          notes: formData.notes || undefined,
        },
      })
      toast.success('Asset updated successfully')
      setShowEditDialog(false)
      setSelectedAsset(null)
      setFormData(initialFormData)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update asset')
    }
  }

  const handleDelete = async () => {
    if (!selectedAsset) return
    try {
      await deleteMutation.mutateAsync(selectedAsset.id)
      toast.success('Asset deleted successfully')
      setShowDeleteDialog(false)
      setSelectedAsset(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete asset')
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'assetTag',
      header: 'Asset Tag',
      cell: (asset) => <span className="font-mono font-medium">{asset.assetTag}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      cell: (asset) => (
        <div>
          <p className="font-medium">{asset.name}</p>
          {asset.serialNumber && <p className="text-helper text-muted-foreground">SN: {asset.serialNumber}</p>}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (asset) => asset.category?.name || 'N/A',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (asset) => <Badge variant={getStatusBadgeVariant(asset.status)}>{asset.status}</Badge>,
    },
    {
      key: 'value',
      header: 'Value',
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (asset) => formatCurrency(asset.currentValue || asset.purchaseCost),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (asset) => (
        <div className="flex items-center justify-end gap-1">
          <Link href={`/dashboard/assets/${asset.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
          </Link>
          {canManageAssets && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(asset) }}>
                <Pencil className="h-4 w-4" />
              </Button>
          )}
          {canDeleteAssets && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setSelectedAsset(asset); setShowDeleteDialog(true) }}>
                <Trash2 className="h-4 w-4" />
              </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description="Manage your organization's assets"
        action={canManageAssets ? (
          <Button onClick={() => { setFormData(initialFormData); setSelectedAsset(null); setShowCreateDialog(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        ) : undefined}
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search assets..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        emptyIcon={Package}
        emptyTitle="You haven't added any assets yet"
        emptyDescription="Get started by clicking 'Add Asset' above."
        page={data?.meta?.page || page}
        totalPages={data?.meta?.totalPages || 1}
        total={data?.meta?.total}
        onPageChange={setPage}
      />

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Asset</DialogTitle>
            <DialogDescription>Add a new asset to your inventory. Fields marked with * are required.</DialogDescription>
          </DialogHeader>
          <AssetForm
            form={formData}
            setForm={setFormData}
            categories={categories}
            vendors={vendors}
            locations={locations}
            selectedAsset={selectedAsset}
            onSubmit={handleCreate}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>Update asset information.</DialogDescription>
          </DialogHeader>
          <AssetForm
            form={formData}
            setForm={setFormData}
            categories={categories}
            vendors={vendors}
            locations={locations}
            selectedAsset={selectedAsset}
            onSubmit={handleUpdate}
            isLoading={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Asset"
        description={`Are you sure you want to delete "${selectedAsset?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
