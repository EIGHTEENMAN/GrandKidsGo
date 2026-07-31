-- 2026-07-31 v1.0 Phase B：评分升级 — ChildRating + 4 字段，ChildFeelingProfile + 4 维聚合
-- 详见 项目建设方案/亲子宝典数据闭环-v1.0.md §1.3 + §1.4 + §6

-- AlterTable: child_ratings 加 4 字段
-- AlterTable
ALTER TABLE "child_ratings"
  ADD COLUMN "favorite_moment"  TEXT,
  ADD COLUMN "wish_to_return"    TEXT,
  ADD COLUMN "parent_joy"        TEXT,
  ADD COLUMN "cry_triggers"      JSONB;

-- AlterTable: child_feeling_profiles 加 4 维聚合
-- AlterTable
ALTER TABLE "child_feeling_profiles"
  ADD COLUMN "monthly_feedback"            JSONB,
  ADD COLUMN "cross_spot_pattern"          JSONB,
  ADD COLUMN "top_emotion_triggers"        JSONB,
  ADD COLUMN "parent_joy_by_activity"      JSONB;
