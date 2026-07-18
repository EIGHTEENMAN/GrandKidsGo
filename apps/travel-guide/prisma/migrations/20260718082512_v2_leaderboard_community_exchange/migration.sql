-- CreateTable
CREATE TABLE "travel_leaderboard_snapshots" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "week_key" TEXT,

    CONSTRAINT "travel_leaderboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_badge_exchanges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "badge_def_name" TEXT NOT NULL,
    "points_awarded" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "exchanged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reverted_at" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'manual',

    CONSTRAINT "travel_badge_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_privacy_settings" (
    "user_id" TEXT NOT NULL,
    "allow_leaderboard_public" BOOLEAN NOT NULL DEFAULT true,
    "allow_community_feed" BOOLEAN NOT NULL DEFAULT true,
    "badge_share_scope" TEXT NOT NULL DEFAULT 'private',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_privacy_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "travel_follow_relations" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "followee_id" TEXT NOT NULL,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_follow_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_activities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target_id" TEXT,
    "content_json" JSONB NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "travel_leaderboard_snapshots_scope_period_captured_at_idx" ON "travel_leaderboard_snapshots"("scope", "period", "captured_at" DESC);

-- CreateIndex
CREATE INDEX "travel_badge_exchanges_user_id_exchanged_at_idx" ON "travel_badge_exchanges"("user_id", "exchanged_at" DESC);

-- CreateIndex
CREATE INDEX "travel_badge_exchanges_status_exchanged_at_idx" ON "travel_badge_exchanges"("status", "exchanged_at");

-- CreateIndex
CREATE INDEX "travel_follow_relations_follower_id_idx" ON "travel_follow_relations"("follower_id");

-- CreateIndex
CREATE INDEX "travel_follow_relations_followee_id_idx" ON "travel_follow_relations"("followee_id");

-- CreateIndex
CREATE UNIQUE INDEX "travel_follow_relations_follower_id_followee_id_key" ON "travel_follow_relations"("follower_id", "followee_id");

-- CreateIndex
CREATE INDEX "travel_activities_is_public_created_at_idx" ON "travel_activities"("is_public", "created_at" DESC);

-- CreateIndex
CREATE INDEX "travel_activities_user_id_created_at_idx" ON "travel_activities"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "travel_activities_type_created_at_idx" ON "travel_activities"("type", "created_at" DESC);
