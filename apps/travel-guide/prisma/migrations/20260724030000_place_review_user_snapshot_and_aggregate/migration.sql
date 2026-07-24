-- 2026-07-24 v1.0：地点打分系统
-- 1) PlaceReview 加 user 角色快照字段（防 user-service 不可用时聚合失败）
-- 2) PlaceReview 加唯一约束（同一用户对同一地点只能评一次）
-- 3) 新建 PlaceAggregate 表（评价聚合 + 三视角分 + 便利设施聚合）

-- Step 1: 加快照字段
ALTER TABLE "place_reviews" ADD COLUMN "user_gender" TEXT;
ALTER TABLE "place_reviews" ADD COLUMN "user_role" TEXT;

-- Step 2: 加唯一索引
-- 如果有历史重复数据，需要先清理。开发环境无此风险。
CREATE UNIQUE INDEX "place_reviews_place_id_place_type_user_id_key"
  ON "place_reviews"("place_id", "place_type", "user_id");

-- Step 3: 新建 PlaceAggregate 表
CREATE TABLE "place_aggregates" (
  "place_id" TEXT NOT NULL,
  "place_type" TEXT NOT NULL,
  "kid_avg_score" DOUBLE PRECISION,
  "mom_avg_score" DOUBLE PRECISION,
  "dad_avg_score" DOUBLE PRECISION,
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

CREATE INDEX "place_aggregates_place_type_review_count_idx"
  ON "place_aggregates"("place_type", "review_count" DESC);

CREATE INDEX "place_aggregates_place_type_kid_avg_score_idx"
  ON "place_aggregates"("place_type", "kid_avg_score" DESC);