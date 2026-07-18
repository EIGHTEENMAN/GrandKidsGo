-- CreateTable
CREATE TABLE "operation_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_snapshots" (
    "id" TEXT NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "scope" TEXT NOT NULL,
    "git_path" TEXT NOT NULL,
    "oss_url" TEXT,
    "oss_key" TEXT,
    "file_sha256" TEXT,
    "file_size" INTEGER,
    "record_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operation_logs_actor_id_created_at_idx" ON "operation_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "operation_logs_action_created_at_idx" ON "operation_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "operation_logs_target_type_target_id_idx" ON "operation_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "daily_snapshots_snapshot_date_idx" ON "daily_snapshots"("snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_snapshots_snapshot_date_scope_key" ON "daily_snapshots"("snapshot_date", "scope");
