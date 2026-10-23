-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_categoryId_subjectId_key" ON "UserPermission"("userId", "categoryId", "subjectId");

-- NULL fan butun kategoriya ruxsatidir; oddiy unique indeks NULL takrorini to'smaydi.
CREATE UNIQUE INDEX "UserPermission_userId_categoryId_whole_key" ON "UserPermission"("userId", "categoryId") WHERE "subjectId" IS NULL;

-- Yangi cheklovlar tayyor bo'lgach eski indeks olinadi; qatorlar o'zgarmaydi.
DROP INDEX "UserPermission_userId_categoryId_key";
