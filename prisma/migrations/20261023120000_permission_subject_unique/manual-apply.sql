BEGIN;

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_categoryId_subjectId_key" ON "UserPermission"("userId", "categoryId", "subjectId");

-- NULL fan butun kategoriya ruxsatidir; oddiy unique indeks NULL takrorini to'smaydi.
CREATE UNIQUE INDEX "UserPermission_userId_categoryId_whole_key" ON "UserPermission"("userId", "categoryId") WHERE "subjectId" IS NULL;

-- Yangi cheklovlar tayyor bo'lgach eski indeks olinadi; qatorlar o'zgarmaydi.
DROP INDEX "UserPermission_userId_categoryId_key";

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, '80b85137f0182d3e65401e545948feafc6a978c004d0cc18ea6c4a90f893fa7b', now(), '20261023120000_permission_subject_unique', NULL, NULL, now(), 1);

COMMIT;
