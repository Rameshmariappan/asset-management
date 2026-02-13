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
import { useAssignments, useAssignmentStatistics, useCreateAssignment, useReturnAsset, useAssets, useUsers } from '@/lib/api-hooks'
import { formatDateTime } from '@/lib/utils'
import { UserCheck, Package, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged']

const CreateAssignmentDialog = memo(({
  open,
  onOpenChange,
  createForm,
  setCreateForm,
  availableAssets,
  users,
  handleCreate,
  isPending
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  createForm: any
  setCreateForm: (form: any) => void
  availableAssets: any[]
  users: any[]
  handleCreate: () => void
  isPending: boolean
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>New Assignment</DialogTitle><DialogDescription>Assign an asset to a user.</DialogDescription></DialogHeader>
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Asset *</Label>
          <Select value={createForm.assetId} onValueChange={(v) => setCreateForm({ ...createForm, assetId: v })}>
            <SelectTrigger><SelectValue placeholder="Select available asset" /></SelectTrigger>
            <SelectContent>
              {availableAssets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.assetTag} - {a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Assign To *</Label>
          <Select value={createForm.assignedToUserId} onValueChange={(v) => setCreateForm({ ...createForm, assignedToUserId: v })}>
            <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
            <SelectContent>
              {users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Condition *</Label>
            <Select value={createForm.assignCondition} onValueChange={(v) => setCreateForm({ ...createForm, assignCondition: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rating (1-5) *</Label>
            <Select value={createForm.assignConditionRating} onValueChange={(v) => setCreateForm({ ...createForm, assignConditionRating: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2"><Label>Expected Return Date</Label><Input type="date" value={createForm.expectedReturnDate} onChange={(e) => setCreateForm({ ...createForm, expectedReturnDate: e.target.value })} /></div>
        <div className="space-y-2"><Label>Notes</Label><Textarea value={createForm.assignNotes} onChange={(e) => setCreateForm({ ...createForm, assignNotes: e.target.value })} /></div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={
              isPending ||
              !createForm.assetId ||
              !createForm.assignedToUserId ||
              !createForm.assignCondition ||
              !createForm.assignConditionRating
            }
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Assign Asset
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
))
CreateAssignmentDialog.displayName = 'CreateAssignmentDialog'

const ReturnAssetDialog = memo(({
  open,
  onOpenChange,
  returnForm,
  setReturnForm,
  selectedAssignment,
  handleReturn,
  isPending
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnForm: any
  setReturnForm: (form: any) => void
  selectedAssignment: any
  handleReturn: () => void
  isPending: boolean
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader><DialogTitle>Return Asset</DialogTitle><DialogDescription>Return &quot;{selectedAssignment?.asset?.name}&quot; and record its condition.</DialogDescription></DialogHeader>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Return Condition *</Label>
            <Select value={returnForm.returnCondition} onValueChange={(v) => setReturnForm({ ...returnForm, returnCondition: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rating (1-5) *</Label>
            <Select value={returnForm.returnConditionRating} onValueChange={(v) => setReturnForm({ ...returnForm, returnConditionRating: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2"><Label>Return Notes</Label><Textarea value={returnForm.returnNotes} onChange={(e) => setReturnForm({ ...returnForm, returnNotes: e.target.value })} /></div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleReturn}
            disabled={
              isPending ||
              !returnForm.returnCondition ||
              !returnForm.returnConditionRating
            }
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm Return
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
))
ReturnAssetDialog.displayName = 'ReturnAssetDialog'

export default function AssignmentsPage() {
  const [page, setPage] = useState(1)
  const [isActive, setIsActive] = useState<boolean | undefined>(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showReturn, setShowReturn] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)

  const [createForm, setCreateForm] = useState({ assetId: '', assignedToUserId: '', expectedReturnDate: '', assignCondition: 'Good', assignConditionRating: '4', assignNotes: '' })
  const [returnForm, setReturnForm] = useState({ returnCondition: 'Good', returnConditionRating: '4', returnNotes: '' })

  const { data, isLoading } = useAssignments({ page, limit: 20, isActive })
  const { data: stats } = useAssignmentStatistics()
  const { data: assetsData } = useAssets({ status: 'available', limit: 500 })
  const { data: usersData } = useUsers({ limit: 500, isActive: true })
  const createMutation = useCreateAssignment()
  const returnMutation = useReturnAsset()

  const availableAssets = assetsData?.data || []
  const users = usersData?.data || []

  const handleCreate = async () => {
    // Validate all required fields
    if (!createForm.assetId || !createForm.assignedToUserId ||
        !createForm.assignCondition || !createForm.assignConditionRating) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await createMutation.mutateAsync({
        ...createForm,
        assignConditionRating: parseInt(createForm.assignConditionRating),
        expectedReturnDate: createForm.expectedReturnDate || undefined,
        assignNotes: createForm.assignNotes || undefined,
      })
      toast.success('Asset assigned successfully')
      setShowCreate(false)
      setCreateForm({ assetId: '', assignedToUserId: '', expectedReturnDate: '', assignCondition: 'Good', assignConditionRating: '4', assignNotes: '' })
    } catch (error: any) {
      const errorMessage = error.response?.data?.message ||
                          error.message ||
                          'Failed to assign asset'
      toast.error(errorMessage)
      console.error('Assignment error:', error)
    }
  }

  const handleReturn = async () => {
    if (!selectedAssignment) return

    // Validate required fields
    if (!returnForm.returnCondition || !returnForm.returnConditionRating) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await returnMutation.mutateAsync({
        id: selectedAssignment.id,
        data: {
          returnCondition: returnForm.returnCondition,
          returnConditionRating: parseInt(returnForm.returnConditionRating),
          returnNotes: returnForm.returnNotes || undefined,
        },
      })
      toast.success('Asset returned successfully')
      setShowReturn(false)
      setSelectedAssignment(null)
      setReturnForm({ returnCondition: 'Good', returnConditionRating: '4', returnNotes: '' })
    } catch (error: any) {
      const errorMessage = error.response?.data?.message ||
                          error.message ||
                          'Failed to return asset'
      toast.error(errorMessage)
      console.error('Return asset error:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">Track and manage asset assignments</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <UserCheck className="mr-2 h-4 w-4" /> New Assignment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats?.totalAssignments || 0}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active</CardTitle><TrendingUp className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{stats?.activeAssignments || 0}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Returned</CardTitle><TrendingUp className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{stats?.returnedAssignments || 0}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Overdue</CardTitle><AlertTriangle className="h-4 w-4 text-orange-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{stats?.overdueAssignments || 0}</div></CardContent></Card>
      </div>

      <div className="flex space-x-2 border-b">
        {[
          { label: 'Active Assignments', value: true },
          { label: 'Returned', value: false },
          { label: 'All', value: undefined },
        ].map((tab) => (
          <button key={String(tab.value)} onClick={() => setIsActive(tab.value as any)}
            className={`px-4 py-2 font-medium transition-colors ${isActive === tab.value ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-24 animate-pulse bg-gray-200 rounded" />)}</div>
          ) : (
            <div className="space-y-4">
              {data?.data?.map((assignment: any) => (
                <div key={assignment.id} className="rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg">{assignment.asset?.name}</h3>
                        <Badge variant={assignment.isActive ? 'default' : 'secondary'}>{assignment.isActive ? 'Active' : 'Returned'}</Badge>
                        {assignment.assignCondition && <Badge variant="outline">{assignment.assignCondition}</Badge>}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-muted-foreground">Asset Tag</p><p className="font-mono font-medium">{assignment.asset?.assetTag}</p></div>
                        <div><p className="text-muted-foreground">Assigned To</p><p className="font-medium">{assignment.assignedToUser?.firstName} {assignment.assignedToUser?.lastName}</p></div>
                        <div><p className="text-muted-foreground">Assigned Date</p><p>{formatDateTime(assignment.assignedAt)}</p></div>
                        {assignment.expectedReturnDate && <div><p className="text-muted-foreground">Expected Return</p><p>{formatDateTime(assignment.expectedReturnDate)}</p></div>}
                        {assignment.returnedAt && <div><p className="text-muted-foreground">Returned Date</p><p>{formatDateTime(assignment.returnedAt)}</p></div>}
                        {assignment.returnCondition && <div><p className="text-muted-foreground">Return Condition</p><Badge variant="outline">{assignment.returnCondition}</Badge></div>}
                      </div>
                      {assignment.assignNotes && <div className="mt-3 text-sm"><p className="text-muted-foreground">Notes:</p><p className="italic">{assignment.assignNotes}</p></div>}
                    </div>
                    {assignment.isActive && (
                      <Button variant="outline" size="sm" onClick={() => { setSelectedAssignment(assignment); setShowReturn(true) }}>
                        Return Asset
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {(!data?.data || data.data.length === 0) && (
                <div className="py-12 text-center text-muted-foreground"><UserCheck className="mx-auto h-12 w-12 mb-4 opacity-50" /><p>No assignments found</p></div>
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

      <CreateAssignmentDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        createForm={createForm}
        setCreateForm={setCreateForm}
        availableAssets={availableAssets}
        users={users}
        handleCreate={handleCreate}
        isPending={createMutation.isPending}
      />

      <ReturnAssetDialog
        open={showReturn}
        onOpenChange={setShowReturn}
        returnForm={returnForm}
        setReturnForm={setReturnForm}
        selectedAssignment={selectedAssignment}
        handleReturn={handleReturn}
        isPending={returnMutation.isPending}
      />
    </div>
  )
}
