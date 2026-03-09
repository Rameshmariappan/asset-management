'use client'

import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAsset, useAssetHistory, useGenerateBothTags, useUploadAssetImages, useDeleteAssetImage } from '@/lib/api-hooks'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { QrCode, Loader2, Upload, X, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { usePermissions } from '@/lib/permissions'
import { useRef } from 'react'

export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: asset, isLoading } = useAsset(id)
  const { data: history } = useAssetHistory(id)
  const generateTags = useGenerateBothTags()
  const uploadImages = useUploadAssetImages()
  const deleteImage = useDeleteAssetImage()
  const { canManageTags, canManageAssets } = usePermissions()
  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    try {
      await uploadImages.mutateAsync({ id, files })
      toast.success(`${files.length} image(s) uploaded successfully`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload images')
    }
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const handleDeleteImage = async (imageUrl: string) => {
    try {
      await deleteImage.mutateAsync({ id, imageUrl })
      toast.success('Image deleted')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete image')
    }
  }

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

  const handleGenerateTags = async () => {
    try {
      await generateTags.mutateAsync(id)
      toast.success('Tags generated successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate tags')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Asset not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/assets')}>
          Back to Assets
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={asset.name}
        description={asset.assetTag}
        backHref="/dashboard/assets"
        action={
          <div className="flex items-center gap-3">
            <Badge variant={getStatusBadgeVariant(asset.status)}>{asset.status}</Badge>
            {canManageTags && (
            <Button variant="outline" onClick={handleGenerateTags} disabled={generateTags.isPending}>
              {generateTags.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
              Generate Tags
            </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Serial Number" value={asset.serialNumber} />
            <InfoRow label="Model" value={asset.model} />
            <InfoRow label="Manufacturer" value={asset.manufacturer} />
            <InfoRow label="Category" value={asset.category?.name} />
            <InfoRow label="Vendor" value={asset.vendor?.name} />
            <InfoRow label="Location" value={asset.location?.name} />
            {asset.description && <InfoRow label="Description" value={asset.description} />}
          </CardContent>
        </Card>

        {/* Financial Info */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Purchase Date" value={asset.purchaseDate ? formatDate(asset.purchaseDate) : undefined} />
            <InfoRow label="Purchase Cost" value={asset.purchaseCost ? formatCurrency(asset.purchaseCost, asset.currency) : undefined} />
            <InfoRow label="Current Value" value={asset.currentValue ? formatCurrency(asset.currentValue, asset.currency) : undefined} />
            <InfoRow label="Salvage Value" value={asset.salvageValue ? formatCurrency(asset.salvageValue, asset.currency) : undefined} />
            <InfoRow label="Invoice Number" value={asset.invoiceNumber} />
          </CardContent>
        </Card>

        {/* Warranty Info */}
        <Card>
          <CardHeader>
            <CardTitle>Warranty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Warranty End Date" value={asset.warrantyEndDate ? formatDate(asset.warrantyEndDate) : 'N/A'} />
            <InfoRow label="Warranty Details" value={asset.warrantyDetails || 'N/A'} />
            {asset.warrantyEndDate && (
              <div>
                {new Date(asset.warrantyEndDate) > new Date() ? (
                  <Badge variant="success">Under Warranty</Badge>
                ) : (
                  <Badge variant="destructive">Warranty Expired</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR & Barcode */}
        {(asset.qrCode || asset.barcode) && (
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center space-x-8">
              {asset.qrCode && (
                <div className="text-center">
                  <img src={asset.qrCode} alt="QR Code" className="w-32 h-32" />
                  <p className="text-xs text-muted-foreground mt-2">QR Code</p>
                </div>
              )}
              {asset.barcode && (
                <div className="text-center">
                  <img src={asset.barcode} alt="Barcode" className="h-16" />
                  <p className="text-xs text-muted-foreground mt-2">Barcode</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Asset Images */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Asset Images
            </CardTitle>
            {canManageAssets && (
              <>
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadImages.isPending}
                >
                  {uploadImages.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload Images
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {asset.imageUrls && (asset.imageUrls as string[]).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(asset.imageUrls as string[]).map((url: string, index: number) => (
                <div key={index} className="relative group rounded-lg overflow-hidden border">
                  <img
                    src={url}
                    alt={`Asset image ${index + 1}`}
                    className="w-full h-40 object-cover"
                  />
                  {canManageAssets && (
                    <button
                      onClick={() => handleDeleteImage(url)}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={deleteImage.isPending}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No images uploaded</p>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment & Transfer History</CardTitle>
          <CardDescription>Complete history of this asset</CardDescription>
        </CardHeader>
        <CardContent>
          {history?.assignments?.length > 0 || history?.transfers?.length > 0 ? (
            <div className="space-y-4">
              {history?.assignments?.map((a: any) => (
                <div key={a.id} className="flex items-start space-x-4 border-l-2 border-primary pl-4 py-2">
                  <div className="flex-1">
                    <p className="font-medium">
                      Assigned to {a.assignedToUser?.firstName} {a.assignedToUser?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(a.assignedAt)}
                      {a.returnedAt && ` — Returned ${formatDateTime(a.returnedAt)}`}
                    </p>
                    {a.assignNotes && <p className="text-sm italic mt-1">{a.assignNotes}</p>}
                  </div>
                  <Badge variant={a.isActive ? 'default' : 'secondary'}>
                    {a.isActive ? 'Active' : 'Returned'}
                  </Badge>
                </div>
              ))}
              {history?.transfers?.map((t: any) => (
                <div key={t.id} className="flex items-start space-x-4 border-l-2 border-amber-500 dark:border-amber-400 pl-4 py-2">
                  <div className="flex-1">
                    <p className="font-medium">
                      Transfer: {t.fromUser?.firstName || 'Inventory'} → {t.toUser?.firstName} {t.toUser?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(t.requestedAt)}</p>
                    {t.transferReason && <p className="text-sm italic mt-1">{t.transferReason}</p>}
                  </div>
                  <Badge variant={t.status === 'completed' ? 'success' : t.status === 'rejected' ? 'destructive' : 'default'}>
                    {t.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No history available</p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {asset.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{asset.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between text-table">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  )
}
