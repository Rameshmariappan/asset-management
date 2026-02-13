# Assets Module

## Purpose
Asset lifecycle management — CRUD operations, depreciation calculation, status tracking, history, and statistics.

## Key Files
- `assets.controller.ts` — 8 endpoints (list, create, get, update, delete, status update, history, statistics)
- `assets.service.ts` — business logic with soft delete and depreciation
- `dto/create-asset.dto.ts` — required: assetTag, name, categoryId, vendorId, locationId, purchaseDate, purchaseCost, status
- `dto/update-asset.dto.ts` — all fields optional (PartialType)
- `dto/query-asset.dto.ts` — pagination, search, filters (category, vendor, location, status, date range, warranty expiring)

## Asset Status Flow
```
available ──(assignment created)──► assigned
assigned ──(return: Good/Fair/Excellent)──► available
assigned ──(return: Damaged/Poor)──► damaged
available ──(manual status update)──► maintenance
maintenance ──(manual status update)──► available
any ──(soft delete)──► retired
```

## Depreciation Calculation (on create)
When a new asset is created:
1. Look up the category's `depreciationRate` (%) and `usefulLifeYears`
2. If both are set (used as guard condition), calculate depreciation:
   ```
   yearsOwned = (now - purchaseDate) / 365 days
   depreciationAmount = purchaseCost * (depreciationRate / 100) * yearsOwned
   currentValue = max(purchaseCost - depreciationAmount, salvageValue || 0)
   ```
   Note: `usefulLifeYears` gates entry into the calculation but is not used in the formula itself — depreciation is uncapped by useful life.
3. If category has no depreciation config, `currentValue = purchaseCost`

Note: Depreciation is only calculated at creation time. No scheduled recalculation exists.

## Soft Delete
- `DELETE /assets/:id` sets `deletedAt = now()` and `status = retired`
- Blocked if asset has active assignments (`isActive = true`)
- All queries filter `deletedAt: null`

## Uniqueness Validation
- `assetTag` must be unique (checked before create/update)
- `serialNumber` must be unique if provided (checked before create/update)

## Statistics Endpoint
Returns:
- Total assets (excluding deleted)
- Count by status: available, assigned, maintenance, damaged, retired
- Total current value (aggregate sum)
- Assets with warranty expiring in next 30 days

## History Endpoint
Returns for a specific asset:
- All assignments (ordered by assignedAt desc) with user details
- All transfers (ordered by requestedAt desc) with from/to user details
