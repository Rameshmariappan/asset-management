-- ============================================================================
-- Multi-Tenancy Migration
-- ============================================================================

-- 1. Create organizations table
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");
CREATE INDEX "organizations_is_active_idx" ON "organizations"("is_active");

-- 2. Create org_invitations table
CREATE TABLE "org_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role_name" VARCHAR(50) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "invited_by_user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "org_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "org_invitations_token_hash_key" ON "org_invitations"("token_hash");
CREATE INDEX "org_invitations_email_idx" ON "org_invitations"("email");
CREATE INDEX "org_invitations_token_hash_idx" ON "org_invitations"("token_hash");
CREATE INDEX "org_invitations_organization_id_idx" ON "org_invitations"("organization_id");

-- 3. Insert default organization for existing data
INSERT INTO "organizations" ("id", "name", "slug", "is_active", "created_at", "updated_at")
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 4. Backfill tenant_id on all existing rows
UPDATE "users" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "departments" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "categories" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "vendors" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "locations" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "assets" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "asset_assignments" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "asset_transfers" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "audit_logs" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;
UPDATE "notifications" SET "tenant_id" = '00000000-0000-0000-0000-000000000001' WHERE "tenant_id" IS NULL;

-- 5. Make tenant_id NOT NULL on all tables
ALTER TABLE "users" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "departments" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "categories" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "vendors" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "locations" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "assets" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "asset_assignments" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "asset_transfers" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "notifications" ALTER COLUMN "tenant_id" SET NOT NULL;

-- 6. Add FK constraints for tenant_id
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK constraints for org_invitations
ALTER TABLE "org_invitations" ADD CONSTRAINT "org_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "org_invitations" ADD CONSTRAINT "org_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. Drop global unique indexes and create tenant-scoped compound uniques
DROP INDEX IF EXISTS "departments_code_key";
CREATE UNIQUE INDEX "departments_code_tenant_id_key" ON "departments"("code", "tenant_id");

DROP INDEX IF EXISTS "categories_code_key";
CREATE UNIQUE INDEX "categories_code_tenant_id_key" ON "categories"("code", "tenant_id");

DROP INDEX IF EXISTS "vendors_code_key";
CREATE UNIQUE INDEX "vendors_code_tenant_id_key" ON "vendors"("code", "tenant_id");

DROP INDEX IF EXISTS "locations_code_key";
CREATE UNIQUE INDEX "locations_code_tenant_id_key" ON "locations"("code", "tenant_id");

DROP INDEX IF EXISTS "assets_asset_tag_key";
DROP INDEX IF EXISTS "assets_asset_tag_idx";
CREATE UNIQUE INDEX "assets_asset_tag_tenant_id_key" ON "assets"("asset_tag", "tenant_id");

-- 8. Remove tenant_id from roles table (roles are global)
ALTER TABLE "roles" DROP COLUMN IF EXISTS "tenant_id";

-- 9. Add is_platform_admin column to users
ALTER TABLE "users" ADD COLUMN "is_platform_admin" BOOLEAN NOT NULL DEFAULT false;
