# Assignments Module

## Purpose
Asset assignment and return workflow — tracks who has what asset, with condition assessment and digital signatures.

## Key Files
- `assignments.controller.ts` — 7 endpoints (list, create, return, statistics, active, user assignments, single)
- `assignments.service.ts` — transactional create/return with asset status management
- `dto/create-assignment.dto.ts` — assetId, assignedToUserId, expectedReturnDate?, condition?, rating?, notes?, signature?
- `dto/return-assignment.dto.ts` — returnCondition?, returnConditionRating?, returnNotes?, returnSignature?, returnPhotoUrls?
- `dto/query-assignment.dto.ts` — pagination, filters (assetId, assignedToUserId, isActive)

## Assignment Lifecycle
```
Create Assignment (POST /assignments)
  ├─ Validate: asset.status === 'available'
  ├─ Validate: no active assignment for this asset
  ├─ Validate: assignedToUser exists and not deleted
  ├─ Hash signature (SHA256) if provided
  └─ Transaction:
      1. Create AssetAssignment (isActive=true, assignedAt=now())
      2. Update Asset.status → 'assigned'

Return Asset (POST /assignments/:id/return)
  ├─ Validate: assignment.isActive === true
  ├─ Hash return signature if provided
  └─ Transaction:
      1. Update assignment: isActive=false, returnedAt=now(), condition, rating, notes
      2. Update asset status:
         - returnCondition is 'Damaged' or 'Poor' → status='damaged'
         - Otherwise → status='available'
```

## Condition Tracking
Each assignment tracks condition at two points:
- **Assign**: `assignCondition` (enum), `assignConditionRating` (1-5), `assignNotes`, `assignPhotoUrls` (JSONB)
- **Return**: `returnCondition`, `returnConditionRating`, `returnNotes`, `returnPhotoUrls`

Condition enum: `Excellent | Good | Fair | Poor | Damaged`

## Digital Signatures
- Signatures stored as URLs in `assignSignatureUrl` / `returnSignatureUrl`
- SHA256 hash stored alongside in `assignSignatureHash` / `returnSignatureHash`
- Used for verification/tamper-detection

## Statistics
Returns counts of:
- `totalAssignments` — all time
- `activeAssignments` — currently active
- `returnedAssignments` — total minus active
- `overdueAssignments` — active with expectedReturnDate < now
