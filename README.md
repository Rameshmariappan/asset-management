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

### Frontend (Coming Soon)
- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui + Framer Motion
- **State**: Zustand + React Query
- **Forms**: React Hook Form + Zod validation

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
├── frontend/                   # Next.js app (TBD)
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

#### Assets (Coming Soon)
- `GET /v1/assets` - List assets (with filters)
- `POST /v1/assets` - Create asset
- `POST /v1/assets/:id/generate-tags` - Generate QR/barcode
- `GET /v1/assets/:id/history` - Asset history

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

### Root (Monorepo)
```bash
npm run dev            # Start all services
npm run docker:dev     # Start Docker services
npm run docker:down    # Stop Docker services
```

## Environment Variables

See `backend/.env.example` for all required environment variables.

**Critical variables**:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for access tokens
- `JWT_REFRESH_SECRET`: Secret for refresh tokens
- `REDIS_URL`: Redis connection string
- `RESEND_API_KEY`: Email provider API key

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

### Phase 1 (MVP) ✅
- [x] Authentication (JWT + MFA)
- [x] User & Role management
- [x] Database schema & migrations
- [x] Audit logging
- [ ] Asset CRUD operations
- [ ] Assignment workflow
- [ ] Transfer workflow
- [ ] QR/Barcode generation
- [ ] Basic notifications

### Phase 2 (Full Features)
- [ ] Maintenance tracking
- [ ] Warranty management
- [ ] Custom fields per category
- [ ] CSV import/export
- [ ] Advanced reporting
- [ ] Email & Slack notifications
- [ ] Frontend implementation
- [ ] Dashboard & analytics

### Phase 3 (Enterprise)
- [ ] SSO integration (Azure AD, Google)
- [ ] Multi-tenancy
- [ ] RFID/IoT integration
- [ ] Mobile app (PWA/React Native)
- [ ] DocuSign integration
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
