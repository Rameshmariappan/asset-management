# Asset Categories & Depreciation - Real-World Scenarios

## Understanding Asset Categories and Depreciation

Categories in your asset management system serve two critical purposes:
1. **Organize assets** into logical groups (Laptops, Monitors, Servers, etc.)
2. **Define depreciation rules** that automatically calculate asset value over time

**Multi-Tenancy Note**: Categories and assets are scoped per organization (tenant). Each organization defines its own categories with its own depreciation rules. All queries are auto-filtered by `tenantId` via Prisma middleware — one organization's categories and depreciation data are completely isolated from another's.

---

## Real-World Scenario 1: IT Company Managing Laptops

### Setting Up the Category

**Company**: TechCorp Inc.
**Need**: Track 100+ employee laptops and their depreciation

**Step 1: Asset Manager Creates "Laptops" Category**

Navigate to: **Categories Page → Create Category**

```
Category Details:
┌─────────────────────────────────────────┐
│ Name: Laptops                           │
│ Code: LAP                               │
│ Icon: 💻                                │
│ Depreciation Rate: 20% per year         │
│ Useful Life: 5 years                    │
│ Description: Employee work laptops      │
└─────────────────────────────────────────┘
```

**Why these numbers?**
- **20% per year**: Industry standard for computer equipment (straight-line depreciation)
- **5 years**: Typical replacement cycle for business laptops
- After 5 years, the laptop is fully depreciated (book value = $0)

---

### Creating Assets with This Category

**Step 2: Asset Manager Purchases 3 MacBook Pros**

**Purchase Date**: January 1, 2024

Navigate to: **Assets Page → Create Asset**

```
Asset 1:
┌─────────────────────────────────────────┐
│ Asset Tag: LAP-2024-001                 │
│ Name: MacBook Pro 16" M3                │
│ Category: Laptops (20% depreciation)    │  ← Category selected
│ Vendor: Apple Inc.                      │
│ Purchase Date: 2024-01-01               │
│ Purchase Cost: $2,500                   │  ← Original cost
│ Current Value: $2,500                   │  ← Auto-calculated
│ Status: Available                       │
└─────────────────────────────────────────┘

Asset 2:
┌─────────────────────────────────────────┐
│ Asset Tag: LAP-2024-002                 │
│ Name: MacBook Pro 14" M3                │
│ Category: Laptops (20% depreciation)    │
│ Purchase Cost: $2,000                   │
│ Current Value: $2,000                   │
└─────────────────────────────────────────┘

Asset 3:
┌─────────────────────────────────────────┐
│ Asset Tag: LAP-2024-003                 │
│ Name: Dell XPS 15                       │
│ Category: Laptops (20% depreciation)    │
│ Purchase Cost: $1,800                   │
│ Current Value: $1,800                   │
└─────────────────────────────────────────┘
```

---

### How Depreciation Works Over Time

**Automatic Depreciation Calculation (Backend)**

The system calculates current value using this formula:

```typescript
// In backend/src/assets/assets.service.ts
const yearsSincePurchase = (new Date() - purchaseDate) / (365 * 24 * 60 * 60 * 1000)
const depreciationRate = category.depreciationRate / 100 // 20% = 0.20
const annualDepreciation = purchasePrice * depreciationRate
const totalDepreciation = annualDepreciation * yearsSincePurchase
const currentValue = Math.max(0, purchasePrice - totalDepreciation)
```

**Asset 1: MacBook Pro 16" - Value Over 5 Years**

```
Purchase: $2,500 (Jan 1, 2024)
Depreciation: 20% per year = $500/year

Timeline:
┌────────────┬──────────────┬─────────────────────┬──────────────┐
│ Date       │ Age (Years)  │ Depreciation        │ Book Value   │
├────────────┼──────────────┼─────────────────────┼──────────────┤
│ 2024-01-01 │ 0            │ $0                  │ $2,500       │
│ 2024-07-01 │ 0.5          │ $250 (6 months)     │ $2,250       │
│ 2025-01-01 │ 1            │ $500 (1 year)       │ $2,000       │
│ 2026-01-01 │ 2            │ $1,000 (2 years)    │ $1,500       │
│ 2027-01-01 │ 3            │ $1,500 (3 years)    │ $1,000       │
│ 2028-01-01 │ 4            │ $2,000 (4 years)    │ $500         │
│ 2029-01-01 │ 5            │ $2,500 (5 years)    │ $0           │ ← Fully depreciated
│ 2030-01-01 │ 6            │ $2,500 (capped)     │ $0           │ ← Cannot go negative
└────────────┴──────────────┴─────────────────────┴──────────────┘
```

**Visual Graph**:
```
$2,500 ●━━━━━━━━┓
       │        ┃
$2,000 │        ●━━━━━━━┓
       │               ┃
$1,500 │               ●━━━━━━┓
       │                      ┃
$1,000 │                      ●━━━━━┓
       │                            ┃
  $500 │                            ●━━━━┓
       │                                 ┃
    $0 └────────────────────────────────●━━━━━━━━►
       Y0    Y1    Y2    Y3    Y4    Y5    Y6
```

---

### Viewing in the Application

**Asset Detail Page** (Click on MacBook Pro #1)

**Today's Date: January 1, 2026** (2 years old)

```
╔═══════════════════════════════════════════════════════╗
║           MacBook Pro 16" M3 (LAP-2024-001)           ║
╚═══════════════════════════════════════════════════════╝

📋 Basic Information
├─ Asset Tag: LAP-2024-001
├─ Category: 💻 Laptops (20% depreciation/year)
├─ Status: 🟢 Assigned
└─ Location: Office - Floor 3

💰 Financial Information
├─ Purchase Date: Jan 1, 2024
├─ Purchase Cost: $2,500.00
├─ Current Value: $1,500.00        ← Auto-calculated (2 years old)
├─ Total Depreciation: $1,000.00   ← $500/year × 2 years
├─ Depreciation Rate: 20% per year
└─ Remaining Life: 3 years

📊 Depreciation Schedule
┌──────┬─────────────┐
│ Year │ Book Value  │
├──────┼─────────────┤
│ 2024 │ $2,500      │
│ 2025 │ $2,000      │
│ 2026 │ $1,500 ◄─── You are here
│ 2027 │ $1,000      │
│ 2028 │ $500        │
│ 2029 │ $0          │
└──────┴─────────────┘
```

---

### Categories Page Shows Asset Count

**Categories Page → View Laptops Category**

```
╔══════════════════════════════════════════════════════╗
║                  📊 Laptops Category                  ║
╚══════════════════════════════════════════════════════╝

Code: LAP
Icon: 💻
Depreciation Rate: 20% per year
Useful Life: 5 years

┌─────────────────────────────────────┐
│ 🔢 Total Assets: 3                  │
├─────────────────────────────────────┤
│ Status Breakdown:                   │
│  ├─ Available: 0                    │
│  ├─ Assigned: 3                     │
│  ├─ Maintenance: 0                  │
│  └─ Retired: 0                      │
├─────────────────────────────────────┤
│ 💵 Total Purchase Value: $6,300     │
│ 💵 Current Book Value: $4,500       │  ← Sum of all 3 laptops
│ 📉 Total Depreciation: $1,800       │
└─────────────────────────────────────┘

📋 Assets in this category:
┌──────────────┬──────────────────┬──────────┬──────────────┐
│ Asset Tag    │ Name             │ Purchase │ Current Value│
├──────────────┼──────────────────┼──────────┼──────────────┤
│ LAP-2024-001 │ MacBook Pro 16"  │ $2,500   │ $1,500       │
│ LAP-2024-002 │ MacBook Pro 14"  │ $2,000   │ $1,200       │
│ LAP-2024-003 │ Dell XPS 15      │ $1,800   │ $1,080       │
└──────────────┴──────────────────┴──────────┴──────────────┘
```

---

## Real-World Scenario 2: Data Center Managing Servers

### Different Depreciation Rules for Different Asset Types

**Company**: CloudHost Inc.
**Need**: Servers depreciate slower than laptops (longer useful life)

**Step 1: Create "Servers" Category**

```
Category: Servers
┌─────────────────────────────────────────┐
│ Name: Servers                           │
│ Code: SRV                               │
│ Icon: 🖥️                                │
│ Depreciation Rate: 10% per year         │  ← Slower depreciation
│ Useful Life: 10 years                   │  ← Longer useful life
│ Description: Production servers         │
└─────────────────────────────────────────┘
```

**Why different rates?**
- Servers are more durable and have longer operational life
- They're upgraded/maintained rather than replaced entirely
- Industry standard: 10% depreciation over 10 years

**Step 2: Purchase Server**

```
Asset: Dell PowerEdge R750
┌─────────────────────────────────────────┐
│ Asset Tag: SRV-2024-001                 │
│ Category: Servers (10% depreciation)    │  ← Different category
│ Purchase Date: 2024-01-01               │
│ Purchase Cost: $10,000                  │
│ Status: Available                       │
└─────────────────────────────────────────┘
```

**Comparison After 2 Years (Jan 1, 2026)**:

```
┌──────────────────┬──────────────────┬──────────────────┐
│                  │ Laptop           │ Server           │
├──────────────────┼──────────────────┼──────────────────┤
│ Purchase Price   │ $2,500           │ $10,000          │
│ Depreciation Rate│ 20%/year         │ 10%/year         │
│ Age              │ 2 years          │ 2 years          │
│ Annual Deprec.   │ $500/year        │ $1,000/year      │
│ Total Deprec.    │ $1,000           │ $2,000           │
│ Current Value    │ $1,500 (60%)     │ $8,000 (80%)     │
│ Remaining Life   │ 3 years          │ 8 years          │
└──────────────────┴──────────────────┴──────────────────┘
```

**Key Insight**: The server retains **80% of its value** after 2 years, while the laptop only retains **60%**. This reflects real-world usage patterns.

---

## Real-World Scenario 3: Office Furniture (No Depreciation)

### Creating a Category Without Depreciation

**Company**: TechCorp Inc.
**Need**: Track office furniture but don't depreciate it (for simplicity)

```
Category: Office Furniture
┌─────────────────────────────────────────┐
│ Name: Office Furniture                  │
│ Code: FURN                              │
│ Icon: 🪑                                │
│ Depreciation Rate: 0% per year          │  ← No depreciation
│ Useful Life: 20 years                   │  ← Very long life
│ Description: Desks, chairs, cabinets    │
└─────────────────────────────────────────┘
```

**Asset: Standing Desk**

```
┌─────────────────────────────────────────┐
│ Asset Tag: FURN-2024-001                │
│ Category: Office Furniture (0% deprec.) │
│ Purchase Date: 2024-01-01               │
│ Purchase Cost: $800                     │
│ Current Value: $800                     │  ← Never changes
└─────────────────────────────────────────┘
```

**After 5 years**: Current Value still $800 (no depreciation)

---

## Real-World Scenario 4: Multi-Category Comparison

### Company Asset Portfolio (Jan 1, 2026 - 2 years after purchase)

**All assets purchased on Jan 1, 2024**

```
┌─────────┬───────────────────┬──────────┬──────────┬────────┬──────────────┬──────────────┐
│Category │ Asset             │ Purchase │ Deprec.  │ Age    │ Depreciation │ Current Value│
│         │                   │ Price    │ Rate     │        │ Amount       │              │
├─────────┼───────────────────┼──────────┼──────────┼────────┼──────────────┼──────────────┤
│💻 Laptop│ MacBook Pro 16    │ $2,500   │ 20%/year │ 2 yrs  │ $1,000       │ $1,500 (60%) │
│💻 Laptop│ Dell XPS 15       │ $1,800   │ 20%/year │ 2 yrs  │ $720         │ $1,080 (60%) │
│🖥️ Server│ Dell PowerEdge    │ $10,000  │ 10%/year │ 2 yrs  │ $2,000       │ $8,000 (80%) │
│📱 Phone │ iPhone 15 Pro     │ $1,200   │ 25%/year │ 2 yrs  │ $600         │ $600  (50%)  │
│🖨️ Printer│ HP LaserJet      │ $500     │ 15%/year │ 2 yrs  │ $150         │ $350  (70%)  │
│🪑 Furn. │ Standing Desk     │ $800     │ 0%/year  │ 2 yrs  │ $0           │ $800  (100%) │
├─────────┴───────────────────┴──────────┴──────────┴────────┼──────────────┼──────────────┤
│                                              TOTAL:         │ $3,870       │ $12,330      │
└────────────────────────────────────────────────────────────┴──────────────┴──────────────┘

Original Purchase Total: $16,800
Current Book Value: $12,330
Total Depreciation: $4,470 (26.6% overall)
```

---

## Business Use Cases

### Use Case 1: Annual Financial Reporting

**Scenario**: CFO needs year-end asset valuation for financial statements

Navigate to: **Reports → Assets Report**

```
Year-End Report (2025)
══════════════════════════════════════════════════

Assets by Category:
┌──────────────────┬───────┬──────────────┬──────────────┐
│ Category         │ Count │ Book Value   │ Depreciation │
├──────────────────┼───────┼──────────────┼──────────────┤
│ 💻 Laptops       │   25  │ $37,500      │ $12,500      │
│ 🖥️ Servers       │    5  │ $40,000      │ $10,000      │
│ 📱 Phones        │   30  │ $18,000      │ $18,000      │
│ 🖨️ Printers      │    8  │ $2,800       │ $1,200       │
│ 🪑 Furniture     │   50  │ $40,000      │ $0           │
├──────────────────┼───────┼──────────────┼──────────────┤
│ TOTAL            │  118  │ $138,300     │ $41,700      │
└──────────────────┴───────┴──────────────┴──────────────┘

Total Asset Investment: $180,000
Current Book Value: $138,300
Accumulated Depreciation: $41,700
Depreciation Percentage: 23.2%
```

**Benefit**: Accurate financial reporting with automatic depreciation calculation

---

### Use Case 2: Budget Planning for Replacements

**Scenario**: IT Manager plans 2027 laptop replacement budget

Navigate to: **Assets → Filter by Category: Laptops**

```
Laptops Reaching End of Life (2027)
═════════════════════════════════════════════════

Assets purchased in 2022 (5 years old in 2027):
┌──────────────┬──────────────────┬──────────────┬───────────────┐
│ Asset Tag    │ Name             │ Current Value│ Status        │
├──────────────┼──────────────────┼──────────────┼───────────────┤
│ LAP-2022-001 │ MacBook Pro 2022 │ $250 (90%)   │ Due for retire│
│ LAP-2022-002 │ Dell XPS 2022    │ $180 (90%)   │ Due for retire│
│ LAP-2022-003 │ MacBook Air 2022 │ $200 (90%)   │ Due for retire│
│ ... (10 more laptops)                                         │
└──────────────┴──────────────────┴──────────────┴───────────────┘

Total laptops to replace: 13
Estimated replacement cost: $32,500 (13 × $2,500/laptop)
Budget Required: $35,000 (including 10% buffer)
```

**Benefit**: Proactive replacement planning based on asset age and depreciation

---

### Use Case 3: Tax Deductions

**Scenario**: Accountant calculates tax deductions based on depreciation

```
Tax Year 2025 - Depreciation Deductions
═════════════════════════════════════════════════

Total Depreciation for Tax Year: $35,400

By Category:
┌──────────────────┬──────────────────┐
│ Category         │ Depreciation     │
├──────────────────┼──────────────────┤
│ Laptops          │ $12,500          │
│ Servers          │ $10,000          │
│ Phones           │ $9,000           │
│ Printers         │ $1,200           │
│ Monitors         │ $2,700           │
└──────────────────┴──────────────────┘

Tax Benefit (25% rate): $8,850
```

**Benefit**: Accurate depreciation tracking for tax compliance

---

## How Categories Work in Your Application

### Backend Calculation (Automatic)

**File**: `backend/src/assets/assets.service.ts`

```typescript
async calculateCurrentValue(asset: Asset): Promise<number> {
  // Get category with depreciation rules
  const category = await this.prisma.category.findUnique({
    where: { id: asset.categoryId }
  })

  if (!category || category.depreciationRate === 0) {
    return asset.purchasePrice // No depreciation
  }

  // Calculate years since purchase
  const purchaseDate = new Date(asset.purchaseDate)
  const now = new Date()
  const yearsSincePurchase = (now.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)

  // Straight-line depreciation
  const annualDepreciation = asset.purchasePrice * (category.depreciationRate / 100)
  const totalDepreciation = annualDepreciation * yearsSincePurchase

  // Cap at useful life (can't depreciate below $0)
  const maxDepreciation = asset.purchasePrice
  const actualDepreciation = Math.min(totalDepreciation, maxDepreciation)

  const currentValue = asset.purchasePrice - actualDepreciation

  return Math.max(0, currentValue) // Never negative
}
```

---

### Frontend Display

**Asset List Page** (`frontend/src/app/dashboard/assets/page.tsx`):

```typescript
// Shows current value calculated from category depreciation
{assets.map(asset => (
  <tr key={asset.id}>
    <td>{asset.assetTag}</td>
    <td>{asset.name}</td>
    <td>{asset.category.name}</td>
    <td>${asset.purchasePrice.toLocaleString()}</td>
    <td className="font-bold">
      ${asset.currentValue.toLocaleString()}  {/* Auto-calculated */}
      <span className="text-sm text-gray-500">
        ({((asset.currentValue / asset.purchasePrice) * 100).toFixed(0)}%)
      </span>
    </td>
  </tr>
))}
```

**Output**:
```
MacBook Pro 16    Laptops    $2,500    $1,500 (60%)
Dell XPS 15       Laptops    $1,800    $1,080 (60%)
Dell Server       Servers    $10,000   $8,000 (80%)
```

---

## Summary

### Key Concepts

1. **Categories Define Depreciation Rules**
   - Each category has a depreciation rate (%)
   - Each category has a useful life (years)
   - Different asset types = different depreciation rates

2. **Automatic Value Calculation**
   - Backend calculates current value on every request
   - Formula: `Current Value = Purchase Price - (Annual Depreciation × Years)`
   - Never goes below $0

3. **Business Benefits**
   - Accurate financial reporting
   - Tax deduction tracking
   - Replacement planning
   - Asset lifecycle management

4. **Real-World Rates**
   - Laptops/Computers: 20-25% (4-5 year life)
   - Servers/Infrastructure: 10-15% (7-10 year life)
   - Phones/Tablets: 25-33% (3-4 year life)
   - Furniture: 0-10% (10-20 year life)
   - Vehicles: 15-20% (5-7 year life)

### Categories Page Shows Asset Count

When you view a category, you see:
- Total number of assets in that category
- Sum of purchase prices
- Sum of current values
- Total depreciation amount
- List of all assets in the category

This gives managers a complete view of asset value by type!
