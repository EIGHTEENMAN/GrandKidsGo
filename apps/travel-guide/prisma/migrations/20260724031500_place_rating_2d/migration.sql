-- 2026-07-24 v1.0：地点打分系统（二维：大人 + 孩子）
-- 1) PlaceReview 加唯一约束（同一用户同一地点只能评一次）
-- 2) 新建 PlaceAggregate 表（二维评分聚合 + 便利设施聚合）

-- Step 1: 加唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS "place_reviews_place_id_place_type_user_id_key"
  ON "place_reviews"("place_id", "place_type", "user_id");

-- Step 2: 新建 PlaceAggregate 表（二维：大人评分 + 孩子评分 + 便利聚合）
CREATE TABLE IF NOT EXISTS "place_aggregates" (
  "place_id" TEXT NOT NULL,
  "place_type" TEXT NOT NULL,
  "adult_avg_score" DOUBLE PRECISION,
  "kid_avg_score" DOUBLE PRECISION,
  "review_count" INTEGER NOT NULL DEFAULT 0,
  "with_child_rating_count" INTEGER NOT NULL DEFAULT 0,
  "parking_rate" DOUBLE PRECISION,
  "high_chair_rate" DOUBLE PRECISION,
  "nap_room_rate" DOUBLE PRECISION,
  "stroller_ok_rate" DOUBLE PRECISION,
  "kid_friendly_avg" DOUBLE PRECISION,
  "last_reviewed_at" TIMESTAMP(3),
  "recomputed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "place_aggregates_pkey" PRIMARY KEY ("place_id","place_type")
);

CREATE INDEX IF NOT EXISTS "place_aggregates_place_type_review_count_idx"
  ON "place_aggregates"("place_type", "review_count" DESC);

CREATE INDEX IF NOT EXISTS "place_aggregates_place_type_kid_avg_score_idx"
  ON "place_aggregates"("place_type", "kid_avg_score" DESC);