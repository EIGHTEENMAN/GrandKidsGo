-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "target_ids" TEXT[],
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "agreement_version" TEXT NOT NULL,
    "guardian_phone" TEXT NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,
    "revoke_media_ids" TEXT[],

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retraction_logs" (
    "id" TEXT NOT NULL,
    "initiated_by" TEXT NOT NULL,
    "initiated_by_user_id" TEXT NOT NULL,
    "media_ids" TEXT[],
    "guide_id" TEXT,
    "plan_id" TEXT,
    "proof_type" TEXT,
    "proof_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "cascade_actions" JSONB NOT NULL,
    "completed_at" TIMESTAMP(3),
    "public_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retraction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_feature_vector_tracking" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "source_media_ids" TEXT[],
    "vector_type" TEXT NOT NULL,
    "model_provider" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "storage_location" TEXT NOT NULL,
    "purge_requested_at" TIMESTAMP(3),
    "purged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_feature_vector_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consent_records_user_id_child_id_idx" ON "consent_records"("user_id", "child_id");

-- CreateIndex
CREATE INDEX "consent_records_granted_at_idx" ON "consent_records"("granted_at");

-- CreateIndex
CREATE INDEX "consent_records_scope_idx" ON "consent_records"("scope");

-- CreateIndex
CREATE INDEX "retraction_logs_status_idx" ON "retraction_logs"("status");

-- CreateIndex
CREATE INDEX "retraction_logs_created_at_idx" ON "retraction_logs"("created_at");

-- CreateIndex
CREATE INDEX "ai_feature_vector_tracking_child_id_idx" ON "ai_feature_vector_tracking"("child_id");

-- CreateIndex
CREATE INDEX "ai_feature_vector_tracking_purge_requested_at_idx" ON "ai_feature_vector_tracking"("purge_requested_at");
