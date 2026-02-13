'use client'

import { useState, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  useTransfers, useTransferStatistics, useCreateTransfer,
  useApproveTransferByManager, useApproveTransferByAdmin, useRejectTransfer, useAssets, useUsers,
} from '@/lib/api-hooks'
import { formatDateTime } from '@/lib/utils'
import { ArrowRightLeft, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const CreateTransferDialog = memo(({
  showCreate,
  setShowCreate,
  createForm,
  setCreateForm,
  assets,
  users,
  handleCreate,
  isPending
}: {
  showCreate: boolean
  setShowCreate: (show: boolean) => void
  createForm: { assetId: string; toUserId: string; transferReason: string }
  setCreateForm: (form: { assetId: string; toUserId: string; transferReason: string }) => void
  assets: any[]
  users: any[]
  handleCreate: () => void
  isPending: boolean
}) => {
  return (
    <Dialog open={showCreate} onOpenChange={setShowCreate}>
      <DialogContent><DialogHeader><DialogTitle>Request Transfer</DialogTitle><DialogDescription>Request an asset transfer to another user.</DialogDescription></DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Asset *</Label>
            <Select value={createForm.assetId} onValueChange={(v) => setCreateForm({ ...createForm, assetId: v })}>
              <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
              <SelectContent>{assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.assetTag} - {a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Transfer To *</Label>
            <Select value={createForm.toUserId} onValueChange={(v) => setCreateForm({ ...createForm, toUserId: v })}>
              <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
              <SelectContent>{users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Reason</Label><Textarea value={createForm.transferReason} onChange={(e) => setCreateForm({ ...createForm, transferReason: e.target.value })} /></div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={isPending || !createForm.assetId || !createForm.toUserId}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Request Transfer
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
})
CreateTransferDialog.displayName = 'CreateTransferDialog'

const ApproveTransferDialog = memo(({
  showApproveNotes,
  setShowApproveNotes,
  approvalType,
  notes,
  setNotes,
  handleApprove,
  isApproving
}: {
  showApproveNotes: boolean
  setShowApproveNotes: (show: boolean) => void
  approvalType: 'manager' | 'admin'
  notes: string
  setNotes: (notes: string) => void
  handleApprove: () => void
  isApproving: boolean
}) => {
  return (
    <Dialog open={showApproveNotes} onOpenChange={setShowApproveNotes}>
      <DialogContent><DialogHeader><DialogTitle>Approve Transfer</DialogTitle><DialogDescription>Approve as {approvalType}. Add optional notes.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Notes (optional)</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveNotes(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={isApproving}>
              {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Approve
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
})
ApproveTransferDialog.displayName = 'ApproveTransferDialog'

const RejectTransferDialog = memo(({
  showReject,
  setShowReject,
  rejectionReason,
  setRejectionReason,
  handleReject,
  isPending
}: {
  showReject: boolean
  setShowReject: (show: boolean) => void
  rejectionReason: string
  setRejectionReason: (reason: string) => void
  handleReject: () => void
  isPending: boolean
}) => {
  return (
    <Dialog open={showReject} onOpenChange={setShowReject}>
      <DialogContent><DialogHeader><DialogTitle>Reject Transfer</DialogTitle><DialogDescription>Provide a reason for rejection.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Reason *</Label><Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Rejection reason..." /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isPending || !rejectionReason}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Reject
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
})
RejectTransferDialog.displayName = 'RejectTransferDialog'

export default function TransfersPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string | undefined>()
  const [showCreate, setShowCreate] = useState(false)
  const [showApproveNotes, setShowApproveNotes] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null)
  const [approvalType, setApprovalType] = useState<'manager' | 'admin'>('manager')

  const [createForm, setCreateForm] = useState({ assetId: '', toUserId: '', transferReason: '' })
  const [notes, setNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  const { data, isLoading } = useTransfers({ page, limit: 20, status })
  const { data: stats } = useTransferStatistics()
  const { data: assetsData } = useAssets({ limit: 100 })
  const { data: usersData } = useUsers({ limit: 100 })
  const createMutation = useCreateTransfer()
  const approveManagerMutation = useApproveTransferByManager()
  const approveAdminMutation = useApproveTransferByAdmin()
  const rejectMutation = useRejectTransfer()

  const assets = assetsData?.data || []
  const users = usersData?.data || []

  const getStatusBadgeVariant = (s: string) => {
    const v: Record<string, any> = { pending: 'warning', manager_approved: 'default', admin_approved: 'default', completed: 'success', rejected: 'destructive' }
    return v[s] || 'default'
  }
  const getStatusLabel = (s: string) => {
    const l: Record<string, string> = { pending: 'Pending Manager Approval', manager_approved: 'Pending Admin Approval', admin_approved: 'Admin Approved', completed: 'Completed', rejected: 'Rejected' }
    return l[s] || s
  }

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({ ...createForm, transferReason: createForm.transferReason || undefined })
      toast.success('Transfer requested')
      setShowCreate(false)
      setCreateForm({ assetId: '', toUserId: '', transferReason: '' })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create transfer')
    }
  }

  const handleApprove = async () => {
    if (!selectedTransfer) return
    try {
      if (approvalType === 'manager') {
        await approveManagerMutation.mutateAsync({ id: selectedTransfer.id, notes: notes || undefined })
      } else {
        await approveAdminMutation.mutateAsync({ id: selectedTransfer.id, notes: notes || undefined })
      }
      toast.success(`Transfer approved by ${approvalType}`)
      setShowApproveNotes(false)
      setSelectedTransfer(null)
      setNotes('')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve transfer')
    }
  }

  const handleReject = async () => {
    if (!selectedTransfer || !rejectionReason) return
    try {
      await rejectMutation.mutateAsync({ id: selectedTransfer.id, rejectionReason })
      toast.success('Transfer rejected')
      setShowReject(false)
      setSelectedTransfer(null)
      setRejectionReason('')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject transfer')
    }
  }

  const isApproving = approveManagerMutation.isPending || approveAdminMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transfers</h1>
          <p className="text-muted-foreground">Manage asset transfer requests and approvals</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <ArrowRightLeft className="mr-2 h-4 w-4" /> Request Transfer
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle><ArrowRightLeft className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats?.totalTransfers || 0}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pending</CardTitle><Clock className="h-4 w-4 text-orange-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{stats?.pendingTransfers || 0}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Mgr Approved</CardTitle><CheckCircle className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{stats?.managerApprovedTransfers || 0}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Completed</CardTitle><CheckCircle className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{stats?.completedTransfers || 0}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Rejected</CardTitle><XCircle className="h-4 w-4 text-red-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{stats?.rejectedTransfers || 0}</div></CardContent></Card>
      </div>

      <div className="flex space-x-2 border-b">
        {[
          { label: 'All Transfers', value: undefined },
          { label: `Pending (${stats?.pendingTransfers || 0})`, value: 'pending' },
          { label: `Awaiting Admin (${stats?.managerApprovedTransfers || 0})`, value: 'manager_approved' },
          { label: 'Completed', value: 'completed' },
        ].map((tab) => (
          <button key={String(tab.value)} onClick={() => setStatus(tab.value)}
            className={`px-4 py-2 font-medium transition-colors ${status === tab.value ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-32 animate-pulse bg-gray-200 rounded" />)}</div>
          ) : (
            <div className="space-y-4">
              {data?.data?.map((transfer: any) => (
                <div key={transfer.id} className="rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold text-lg">{transfer.asset?.name}</h3>
                      <Badge variant={getStatusBadgeVariant(transfer.status)}>{getStatusLabel(transfer.status)}</Badge>
                    </div>
                    <div className="flex space-x-2">
                      {transfer.status === 'pending' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => { setSelectedTransfer(transfer); setApprovalType('manager'); setNotes(''); setShowApproveNotes(true) }}>Approve (Manager)</Button>
                          <Button variant="outline" size="sm" onClick={() => { setSelectedTransfer(transfer); setRejectionReason(''); setShowReject(true) }}>Reject</Button>
                        </>
                      )}
                      {transfer.status === 'manager_approved' && (
                        <>
                          <Button size="sm" onClick={() => { setSelectedTransfer(transfer); setApprovalType('admin'); setNotes(''); setShowApproveNotes(true) }}>Approve (Admin)</Button>
                          <Button variant="outline" size="sm" onClick={() => { setSelectedTransfer(transfer); setRejectionReason(''); setShowReject(true) }}>Reject</Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div><p className="text-muted-foreground">Asset Tag</p><p className="font-mono font-medium">{transfer.asset?.assetTag}</p></div>
                    <div><p className="text-muted-foreground">From</p><p className="font-medium">{transfer.fromUser ? `${transfer.fromUser.firstName} ${transfer.fromUser.lastName}` : 'Inventory'}</p></div>
                    <div><p className="text-muted-foreground">To</p><p className="font-medium">{transfer.toUser?.firstName} {transfer.toUser?.lastName}</p></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><p className="text-muted-foreground">Requested By</p><p>{transfer.requestedByUser?.firstName} {transfer.requestedByUser?.lastName}</p></div>
                    <div><p className="text-muted-foreground">Requested Date</p><p>{formatDateTime(transfer.requestedAt)}</p></div>
                    {transfer.completedAt && <div><p className="text-muted-foreground">Completed Date</p><p>{formatDateTime(transfer.completedAt)}</p></div>}
                  </div>
                  {transfer.transferReason && <div className="mt-3 text-sm"><p className="text-muted-foreground">Reason:</p><p className="italic">{transfer.transferReason}</p></div>}
                  {transfer.rejectionReason && <div className="mt-3 text-sm bg-red-50 p-2 rounded"><p className="text-red-800 font-medium">Rejection Reason:</p><p className="text-red-700 italic">{transfer.rejectionReason}</p></div>}
                  {(transfer.managerApprovedAt || transfer.adminApprovedAt) && (
                    <div className="mt-3 pt-3 border-t"><p className="text-xs font-medium text-muted-foreground mb-2">Approval Timeline</p>
                      <div className="flex items-center space-x-4 text-xs">
                        {transfer.managerApprovedAt && <div className="flex items-center space-x-1"><CheckCircle className="h-3 w-3 text-green-600" /><span>Manager: {formatDateTime(transfer.managerApprovedAt)}</span></div>}
                        {transfer.adminApprovedAt && <div className="flex items-center space-x-1"><CheckCircle className="h-3 w-3 text-green-600" /><span>Admin: {formatDateTime(transfer.adminApprovedAt)}</span></div>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {(!data?.data || data.data.length === 0) && (
                <div className="py-12 text-center text-muted-foreground"><ArrowRightLeft className="mx-auto h-12 w-12 mb-4 opacity-50" /><p>No transfers found</p></div>
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

      <CreateTransferDialog
        showCreate={showCreate}
        setShowCreate={setShowCreate}
        createForm={createForm}
        setCreateForm={setCreateForm}
        assets={assets}
        users={users}
        handleCreate={handleCreate}
        isPending={createMutation.isPending}
      />

      <ApproveTransferDialog
        showApproveNotes={showApproveNotes}
        setShowApproveNotes={setShowApproveNotes}
        approvalType={approvalType}
        notes={notes}
        setNotes={setNotes}
        handleApprove={handleApprove}
        isApproving={isApproving}
      />

      <RejectTransferDialog
        showReject={showReject}
        setShowReject={setShowReject}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        handleReject={handleReject}
        isPending={rejectMutation.isPending}
      />
    </div>
  )
}
