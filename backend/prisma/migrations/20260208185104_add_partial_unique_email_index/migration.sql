-- DropIndex
DROP INDEX "users_email_key";

-- CreateIndex - Partial unique index for active users only
-- This allows reusing emails after soft delete (when deleted_at IS NOT NULL)
CREATE UNIQUE INDEX "users_email_key" ON "users"("email") WHERE "deleted_at" IS NULL;
