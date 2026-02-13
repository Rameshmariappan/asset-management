# Transfers Module

## Purpose
Asset transfer with dual-approval workflow — requires both manager and admin approval before an asset moves between users.

## Key Files
- `transfers.controller.ts` — 8 endpoints (list, create, get, approve/manager, approve/admin, reject, statistics, pending)
- `transfers.service.ts` — approval logic with transactional completion
- `dto/create-transfer.dto.ts` — assetId, fromUserId?, toUserId, transferReason?
- `dto/approve-transfer.dto.ts` — notes?
- `dto/reject-transfer.dto.ts` — rejectionReason (required)
- `dto/query-transfer.dto.ts` — pagination, filters (assetId, fromUserId, toUserId, status)

## Transfer Status Flow
```
pending ──(manager approves)──► manager_approved ──(admin approves)──► completed
pending ──(anyone rejects)──► rejected
manager_approved ──(anyone rejects)──► rejected
```

## Validation on Create
1. Asset must exist and not be soft-deleted
2. If `fromUserId` provided: user must exist, asset must be currently assigned to them
3. `toUserId` must exist and not be deleted
4. No pending or manager_approved transfer can exist for the same asset

## Manager Approval
- Requires transfer status = `pending`
- Records: `managerApproverId`, `managerApprovedAt`, `managerNotes`
- Status changes to `manager_approved`
- Roles: SUPER_ADMIN, ASSET_MANAGER, DEPARTMENT_HEAD

## Admin Approval (Completes Transfer)
- Requires transfer status = `manager_approved`
- Executes in a **Prisma $transaction**:
  1. Deactivate current assignment (if any): `isActive=false`, `returnedAt=now()`, `returnedToUserId=adminId`
  2. Create new `AssetAssignment` for `toUser`: condition='Good', rating=4, notes='Transferred via request {id}'
  3. Update `Asset.status → 'assigned'`
  4. Update transfer: `status='completed'`, `completedAt=now()`, admin approver fields
- Roles: SUPER_ADMIN only

## Rejection
- Allowed when status is not `completed` or `rejected`
- Records: `rejectedByUserId`, `rejectedAt`, `rejectionReason` (required)
- Roles: SUPER_ADMIN, ASSET_MANAGER, DEPARTMENT_HEAD

## Statistics
Returns counts of:
- `totalTransfers`
- `pendingTransfers` (status = pending)
- `managerApprovedTransfers` (status = manager_approved)
- `completedTransfers`
- `rejectedTransfers`
- `awaitingAction` (pending + managerApproved)
