# Frontend — Next.js SPA

## Overview
Asset management web application built with Next.js 14 (App Router), React 18, TanStack Query 5, and shadcn/ui.

## Entry Point
`src/app/layout.tsx` — wraps app in `<Providers>` (QueryClientProvider + AuthProvider).

## Running
```bash
npm run dev              # from frontend/ — starts on port 3000
npm run dev:frontend     # from root — same via workspace
npm run build            # production build
npm run lint             # ESLint
npm run type-check       # TypeScript check (tsc --noEmit)
```

## Environment
| Variable | Default | Description |
|----------|---------|-------------|
| NEXT_PUBLIC_API_URL | http://localhost:3001/v1 | Backend API base URL |

## Default Credentials (dev)
- Email: `admin@assetapp.com`
- Password: `Admin@123`

## Route Structure
```
/auth/login              — Login (email/password + optional MFA)
/auth/forgot-password    — Request password reset
/auth/reset-password     — Reset password via token (from query string)

/dashboard               — Overview: stats cards, charts, recent activity, quick actions
/dashboard/assets        — Asset CRUD table (search, paginate, create/edit/delete dialogs)
/dashboard/assets/[id]   — Asset detail: info, financials, warranty, tags, history
/dashboard/assignments   — Assignment management with tabs (active/returned/all)
/dashboard/transfers     — Transfer workflow with approval buttons
/dashboard/categories    — Category CRUD with depreciation config
/dashboard/vendors       — Vendor CRUD with contact info
/dashboard/locations     — Location CRUD with address/geo
/dashboard/departments   — Department CRUD with hierarchy
/dashboard/users         — User CRUD with role assignment
/dashboard/settings      — User profile, change password, system info
/dashboard/notifications — Notification center with read/unread management
```

## Key Patterns

### Auth Flow
1. Login form submits to AuthContext.login()
2. If `requiresMfa: true` returned → show MFA code input
3. On success: accessToken stored in JS cookie (15min), user set in context
4. Dashboard layout checks auth on mount → redirects to login if no user
5. All API calls use Axios interceptor for automatic token attachment + refresh

### Data Fetching
- All API calls go through `lib/api-hooks.ts` (TanStack Query hooks)
- Queries: auto-refetch with staleTime 30s-60s, retry 2x
- Mutations: `onSuccess` invalidates related query keys
- Error handling: `toast.error(error.response?.data?.message || fallback)`

### Form Handling
- Most forms use useState for controlled inputs
- Login uses React Hook Form + Zod schema
- Submit flow: validate → `mutateAsync()` → toast → close dialog → reset form
- Buttons disabled while `isPending`

### Navigation
- `components/sidebar.tsx` — 13 nav items + user profile card + logout button
- Dark theme (bg-gray-900), active state highlighted
- Hidden on mobile, fixed width (md:w-64) on desktop

## Dependencies
- **UI**: shadcn/ui (Radix UI primitives + Tailwind CSS), Lucide icons, Sonner toasts
- **Charts**: Recharts (dashboard only)
- **State**: TanStack React Query (server), React Context (auth), useState (UI)
- **Forms**: React Hook Form + Zod (login), controlled inputs (elsewhere)
- **HTTP**: Axios with custom ApiClient class (token refresh queue)
- **Dates**: date-fns for formatting
