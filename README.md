# Enterprise Asset Tracking System

A premium, enterprise-grade asset tracking web application for managing physical assets like laptops, monitors, cables, mobile devices, and more.

## Features

### Core Functionality
- **Authentication & Authorization**: JWT-based auth with MFA (TOTP), refresh tokens, and role-based access control (RBAC)
- **Asset Management**: Complete CRUD operations with lifecycle tracking, QR/barcode generation, and custom fields
- **Assignment Workflow**: Digital signatures, condition tracking with photos, and assignment history
- **Transfer System**: Dual-approval workflow (Manager → IT Admin) with notifications
- **Audit Logging**: Immutable append-only logs for compliance
- **Reporting**: Export to CSV, XLSX, and PDF
- **Notifications**: Email (Resend), in-app, and Slack webhooks

### User Roles
1. **Super Admin**: Full system access
2. **Asset Manager**: Manages assets and assignments
3. **Department Head**: Views department assets, approves transfers
4. **Employee**: Views own assets, requests transfers
5. **Auditor**: Read-only access to audit logs and reports

## Tech Stack

### Backend
- **Framework**: NestJS (Node.js + TypeScript)
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Authentication**: Passport.js + JWT + Speakeasy (MFA)
- **Caching**: Redis (for sessions and rate limiting)
- **Documentation**: Swagger/OpenAPI 3.0

### Frontend ✅
- **Framework**: Next.js 14 (App Router) with TypeScript
- **UI**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack Query (React Query) for server state
- **Auth**: React Context with JWT integration
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Notifications**: Sonner (toast notifications)

### Infrastructure
- **Development**: Docker Compose (Postgres + Redis)
- **Hosting**: Vercel (frontend) + Render (backend) + Supabase (database/storage)
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- npm or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd asset-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start database services**
   ```bash
   docker-compose up -d
   ```

4. **Setup backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration

   # Run migrations
   npm run migrate

   # Seed database (creates roles, permissions, and default admin)
   npm run seed
   ```

5. **Start backend**
   ```bash
   npm run dev
   ```
   Backend will be available at: http://localhost:3001/v1
   Swagger docs: http://localhost:3001/api/docs

6. **Setup frontend**
   ```bash
   cd ../frontend
   cp .env.example .env.local
   # Edit .env.local with your configuration

   # Install dependencies
   npm install
   ```

7. **Start frontend**
   ```bash
   npm run dev
   ```
   Frontend will be available at: http://localhost:3000

### Default Credentials (After Seeding)

**Super Admin**
- Email: `admin@assetapp.com`
- Password: `Admin@123`

**Asset Manager**
- Email: `manager@assetapp.com`
- Password: `Manager@123`

**Employee**
- Email: `employee@assetapp.com`
- Password: `Employee@123`

⚠️ **Important**: Change these passwords immediately in production!

## Project Structure

```
asset-management/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── auth/              # Authentication module
│   │   ├── users/             # User management
│   │   ├── roles/             # Role management
│   │   ├── assets/            # Asset management
│   │   ├── assignments/       # Asset assignments
│   │   ├── transfers/         # Transfer workflow
│   │   ├── categories/        # Asset categories
│   │   ├── vendors/           # Vendor management
│   │   ├── locations/         # Location hierarchy
│   │   ├── audit-logs/        # Audit logging
│   │   ├── notifications/     # Notification system
│   │   ├── tags/              # QR/Barcode generation
│   │   ├── reports/           # Reporting & exports
│   │   ├── prisma/            # Database schema & migrations
│   │   └── common/            # Shared utilities
│   └── prisma/
│       ├── schema.prisma      # Database schema
│       └── seeds/             # Seed data
├── frontend/                   # Next.js 14 app ✅
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/          # Login & Register pages
│   │   │   └── dashboard/     # Protected dashboard pages
│   │   │       ├── assets/
│   │   │       ├── assignments/
│   │   │       ├── transfers/
│   │   │       ├── notifications/
│   │   │       ├── reports/
│   │   │       ├── users/
│   │   │       ├── departments/
│   │   │       ├── categories/
│   │   │       ├── vendors/
│   │   │       ├── locations/
│   │   │       ├── tags/
│   │   │       └── settings/
│   │   ├── components/
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   └── sidebar.tsx    # Navigation sidebar
│   │   └── lib/
│   │       ├── api-client.ts  # Axios client with JWT refresh
│   │       ├── api-hooks.ts   # React Query hooks
│   │       ├── auth-context.tsx
│   │       └── utils.ts
├── shared/                     # Shared types & validators
└── docker-compose.yml         # Local development setup
```

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:3001/api/docs

### Key Endpoints

#### Authentication
- `POST /v1/auth/register` - Register new user
- `POST /v1/auth/login` - Login
- `POST /v1/auth/refresh` - Refresh access token
- `POST /v1/auth/logout` - Logout
- `POST /v1/auth/mfa/setup` - Setup MFA
- `POST /v1/auth/mfa/verify` - Verify & enable MFA
- `GET /v1/auth/me` - Get current user

#### Users
- `GET /v1/users` - List users
- `GET /v1/users/:id` - Get user
- `POST /v1/users` - Create user (Admin only)
- `PATCH /v1/users/:id` - Update user
- `DELETE /v1/users/:id` - Delete user

#### Assets ✅
- `GET /v1/assets` - List assets (with filters)
- `POST /v1/assets` - Create asset
- `GET /v1/assets/:id` - Get asset details
- `PATCH /v1/assets/:id` - Update asset
- `DELETE /v1/assets/:id` - Delete asset
- `POST /v1/assets/:id/generate-tags` - Generate QR/barcode
- `GET /v1/assets/:id/history` - Asset history
- `GET /v1/assets/statistics` - Get asset statistics

#### Assignments ✅
- `GET /v1/assignments` - List assignments
- `POST /v1/assignments` - Create assignment
- `PATCH /v1/assignments/:id/return` - Return asset
- `GET /v1/assignments/statistics` - Get assignment statistics

#### Transfers ✅
- `GET /v1/transfers` - List transfers
- `POST /v1/transfers` - Create transfer request
- `PATCH /v1/transfers/:id/approve` - Approve transfer
- `PATCH /v1/transfers/:id/reject` - Reject transfer
- `GET /v1/transfers/statistics` - Get transfer statistics

#### Reports ✅
- `GET /v1/reports/assets?format=csv|xlsx|pdf` - Export assets report
- `GET /v1/reports/assignments?format=csv|xlsx|pdf` - Export assignments report
- `GET /v1/reports/transfers?format=csv|xlsx|pdf` - Export transfers report
- `GET /v1/reports/audit-logs?format=csv|xlsx|pdf` - Export audit logs
- `GET /v1/reports/users?format=csv|xlsx|pdf` - Export users report

#### Notifications ✅
- `GET /v1/notifications` - List notifications
- `PATCH /v1/notifications/:id/read` - Mark as read
- `PATCH /v1/notifications/read-all` - Mark all as read

## Frontend Application

### Dashboard Pages

#### 🏠 Dashboard (/)
- **Statistics Cards**: Total Assets, Assigned Assets, Total Value, Pending Actions
- **Asset Status Breakdown**: Visual breakdown by status with badges
- **Recent Activity**: Latest audit log entries
- **Quick Actions**: Navigation shortcuts to key features

#### 📦 Assets (/assets)
- **List View**: Paginated asset list with search
- **Asset Cards**: Display name, status, category, location, value
- **Actions**: Edit, View details, Delete
- **Status Badges**: Color-coded status indicators
- **Empty States**: User-friendly empty state messages

#### 📋 Assignments (/assignments)
- **Statistics**: Total, Active, Returned, Overdue assignments
- **Filter Tabs**: Active, Returned, All with counts
- **Assignment Cards**: Asset details, user info, dates, conditions, notes
- **Return Asset**: One-click return functionality
- **Condition Tracking**: Before/After condition display

#### 🔄 Transfers (/transfers)
- **Statistics**: Total, Pending, Manager Approved, Completed, Rejected
- **Dual Approval Workflow**: Visual timeline showing approval stages
- **Action Buttons**: Approve/Reject based on transfer status
- **Status Filtering**: Filter by transfer status
- **Rejection Reasons**: Display rejection reasons when applicable

#### 📊 Reports (/reports)
- **5 Report Types**: Assets, Assignments, Transfers, Users, Audit Logs
- **3 Export Formats**: CSV, XLSX, PDF
- **Direct Downloads**: One-click download to backend endpoints
- **Date Filtering**: Support for dateFrom/dateTo query params

#### 🔔 Notifications (/notifications)
- **Unread Count**: Display unread notification count
- **Mark as Read**: Individual or bulk mark as read
- **Visual Distinction**: Blue background for unread notifications
- **Toast Feedback**: Success/error notifications
- **Auto Refresh**: Automatic data refresh after actions

#### 👥 Users (/users)
- **User List**: Display with email, department, role
- **Role Badges**: Color-coded role badges (Admin, Manager, User)
- **Pagination**: Navigate through user pages

#### 🏢 Management Pages
- **Departments**: Organization departments with descriptions
- **Categories**: Asset categories and classifications
- **Vendors**: Vendor contacts with email/phone
- **Locations**: Physical locations and facilities
- **Tags**: NFC/RFID tag management with status tracking

#### ⚙️ Settings (/settings)
- **Profile Information**: View user profile details
- **Security**: Password management UI (prepared for implementation)
- **Notifications**: Notification preferences configuration
- **System Info**: Account details and status

### Key Frontend Features

#### Authentication
- **Login Page**: Email/password with MFA code input
- **Register Page**: User registration with validation
- **Protected Routes**: Automatic redirect to login if not authenticated
- **Token Management**: Automatic JWT refresh on 401 responses
- **Logout**: Clear tokens and redirect

#### API Integration
- **React Query Hooks**: Custom hooks for all 95 endpoints
- **Automatic Caching**: Smart caching with TanStack Query
- **Optimistic Updates**: Immediate UI updates with rollback on error
- **Error Handling**: Toast notifications for errors
- **Loading States**: Skeleton loaders matching content shape

#### UI/UX
- **Responsive Design**: Mobile-first responsive layouts
- **Consistent Styling**: shadcn/ui components with Tailwind
- **Loading Skeletons**: Smooth loading states
- **Empty States**: Helpful empty state messages
- **Status Colors**: Consistent color coding across app
- **Toast Notifications**: User feedback for all actions

## Database Schema

### Key Tables
- **users**: User accounts with email/password and MFA support
- **roles**: Predefined roles (Super Admin, Asset Manager, etc.)
- **permissions**: Granular permissions (resource + action)
- **assets**: Physical assets with custom fields (JSONB)
- **asset_assignments**: Assignment history with conditions & signatures
- **asset_transfers**: Transfer requests with dual approval
- **audit_logs**: Immutable event logs for compliance

## Security Features

- ✅ JWT access tokens (15m TTL) + refresh tokens (7d)
- ✅ MFA with TOTP (authenticator apps)
- ✅ Bcrypt password hashing (10 rounds)
- ✅ RBAC with fine-grained permissions
- ✅ Rate limiting (10 req/min per IP)
- ✅ Helmet security headers
- ✅ CORS whitelisting
- ✅ SQL injection protection (Prisma ORM)
- ✅ Input validation (class-validator)
- ✅ HttpOnly cookies for refresh tokens
- ✅ Audit logging for sensitive operations

## Development Scripts

### Backend
```bash
npm run dev            # Start dev server with hot reload
npm run build          # Build for production
npm run start:prod     # Start production server
npm run lint           # Run ESLint
npm run test           # Run tests
npm run migrate        # Run database migrations
npm run seed           # Seed database
npm run studio         # Open Prisma Studio
```

### Frontend
```bash
npm run dev            # Start Next.js dev server
npm run build          # Build for production
npm run start          # Start production server
npm run lint           # Run ESLint
```

### Root (Monorepo)
```bash
npm run dev            # Start all services
npm run docker:dev     # Start Docker services
npm run docker:down    # Stop Docker services
```

## Environment Variables

### Backend
See `backend/.env.example` for all required environment variables.

**Critical variables**:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for access tokens
- `JWT_REFRESH_SECRET`: Secret for refresh tokens
- `REDIS_URL`: Redis connection string
- `RESEND_API_KEY`: Email provider API key

### Frontend
Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/v1
```

For production, update with your production backend URL.

## Deployment

### Production Checklist
- [ ] Change all default passwords
- [ ] Set strong JWT secrets (32+ characters)
- [ ] Enable HTTPS
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS for production frontend URL
- [ ] Set up database backups
- [ ] Enable MFA for admin accounts
- [ ] Review and configure rate limits
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure email provider
- [ ] Set up CI/CD pipeline

### Recommended Hosting
- **Frontend**: Vercel (free tier available)
- **Backend**: Render or Railway (free tier available)
- **Database**: Supabase (500MB free)
- **Storage**: Supabase Storage (1GB free)
- **Cache**: Upstash Redis (10k req/day free)

## Roadmap

### Phase 1 (Backend Core) ✅ COMPLETE
- [x] Authentication (JWT + MFA)
- [x] User & Role management
- [x] Database schema & migrations
- [x] Audit logging
- [x] Asset CRUD operations
- [x] Assignment workflow with signatures
- [x] Transfer workflow with dual approval
- [x] QR/Barcode generation
- [x] Notification system
- [x] Departments, Categories, Vendors, Locations
- [x] Tags (NFC/RFID) management

### Phase 2 (Backend Advanced) ✅ COMPLETE
- [x] Maintenance tracking
- [x] Warranty management
- [x] Custom fields per asset
- [x] CSV/XLSX/PDF export (all modules)
- [x] Advanced reporting (5 report types)
- [x] Email notifications (Resend integration)
- [x] Slack webhooks
- [x] Comprehensive statistics endpoints
- [x] Swagger/OpenAPI documentation
- [x] **95 API endpoints across 15 modules**

### Phase 3 (Frontend) ✅ COMPLETE
- [x] Next.js 14 application setup
- [x] Authentication pages (Login/Register with MFA)
- [x] Protected dashboard layout
- [x] Navigation sidebar
- [x] Dashboard with real-time statistics
- [x] Assets management page
- [x] Assignments tracking page
- [x] Transfers approval workflow
- [x] Notifications center
- [x] Reports generation interface
- [x] Users, Departments, Categories, Vendors, Locations, Tags pages
- [x] Settings page
- [x] Complete API integration with React Query

### Phase 4 (Future Enhancements)
- [ ] Advanced forms for asset creation/editing
- [ ] Image upload for asset photos
- [ ] Digital signature capture UI
- [ ] Real-time notifications with WebSockets
- [ ] Advanced filtering and search
- [ ] Mobile-responsive improvements
- [ ] Dark mode support
- [ ] SSO integration (Azure AD, Google)
- [ ] Multi-tenancy support
- [ ] Mobile app (PWA/React Native)
- [ ] BI connectors (Power BI, Tableau)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Create an issue on GitHub
- Email: support@yourcompany.com

## Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
