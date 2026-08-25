-- CreateIndex
CREATE INDEX "Subject_categoryId_order_idx" ON "Subject"("categoryId", "order");

-- CreateIndex
CREATE INDEX "Test_subjectId_isPublished_idx" ON "Test"("subjectId", "isPublished");

-- CreateIndex
CREATE INDEX "Test_categoryId_isPublished_idx" ON "Test"("categoryId", "isPublished");

-- CreateIndex
CREATE INDEX "Test_userId_idx" ON "Test"("userId");

-- CreateIndex
CREATE INDEX "Question_testId_order_idx" ON "Question"("testId", "order");

-- CreateIndex
CREATE INDEX "Question_topic_idx" ON "Question"("topic");

-- CreateIndex
CREATE INDEX "Question_subjectId_idx" ON "Question"("subjectId");

-- CreateIndex
CREATE INDEX "BankQuestion_teacherId_subjectId_idx" ON "BankQuestion"("teacherId", "subjectId");

-- CreateIndex
CREATE INDEX "BankQuestion_topic_idx" ON "BankQuestion"("topic");

-- CreateIndex
CREATE INDEX "CourseLesson_sectionId_order_idx" ON "CourseLesson"("sectionId", "order");

-- CreateIndex
CREATE INDEX "LessonBlock_lessonId_order_idx" ON "LessonBlock"("lessonId", "order");

-- CreateIndex
CREATE INDEX "CourseEnrollment_userId_idx" ON "CourseEnrollment"("userId");

-- CreateIndex
CREATE INDEX "LessonProgress_userId_completed_idx" ON "LessonProgress"("userId", "completed");

-- CreateIndex
CREATE INDEX "TestResult_userId_completedAt_idx" ON "TestResult"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "TestResult_testId_idx" ON "TestResult"("testId");

-- CreateIndex
CREATE INDEX "Subscription_userId_isActive_endDate_idx" ON "Subscription"("userId", "isActive", "endDate");

-- CreateIndex
CREATE INDEX "Payment_userId_status_idx" ON "Payment"("userId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

