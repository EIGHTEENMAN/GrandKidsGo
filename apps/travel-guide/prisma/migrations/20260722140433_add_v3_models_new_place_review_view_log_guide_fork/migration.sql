-- CreateTable
CREATE TABLE "place_reviews" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "place_type" TEXT NOT NULL,
    "place_name" TEXT,
    "city_id" TEXT,
    "user_id" TEXT NOT NULL,
    "adult_rating" INTEGER NOT NULL,
    "child_rating" INTEGER,
    "child_age_months" INTEGER,
    "text" TEXT,
    "tags" TEXT[],
    "visit_date" TIMESTAMP(3),
    "has_parking" BOOLEAN NOT NULL DEFAULT false,
    "has_high_chair" BOOLEAN NOT NULL DEFAULT false,
    "has_nap_room" BOOLEAN NOT NULL DEFAULT false,
    "stroller_ok" BOOLEAN NOT NULL DEFAULT false,
    "kid_friendly" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "place_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_view_logs" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "place_type" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "place_view_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_forks" (
    "id" TEXT NOT NULL,
    "source_guide_id" TEXT NOT NULL,
    "forked_by_user_id" TEXT NOT NULL,
    "plan_record_id" TEXT,
    "modified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_forks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "place_reviews_place_id_place_type_idx" ON "place_reviews"("place_id", "place_type");

-- CreateIndex
CREATE INDEX "place_reviews_city_id_created_at_idx" ON "place_reviews"("city_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "place_reviews_user_id_idx" ON "place_reviews"("user_id");

-- CreateIndex
CREATE INDEX "place_reviews_status_idx" ON "place_reviews"("status");

-- CreateIndex
CREATE INDEX "place_view_logs_place_id_place_type_created_at_idx" ON "place_view_logs"("place_id", "place_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "place_view_logs_action_created_at_idx" ON "place_view_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "guide_forks_source_guide_id_idx" ON "guide_forks"("source_guide_id");

-- CreateIndex
CREATE INDEX "guide_forks_forked_by_user_id_created_at_idx" ON "guide_forks"("forked_by_user_id", "created_at" DESC);
