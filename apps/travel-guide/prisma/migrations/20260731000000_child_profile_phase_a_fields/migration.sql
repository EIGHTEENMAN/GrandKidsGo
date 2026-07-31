-- 2026-07-31 v1.0 Phase A：ChildProfile 加 7 字段
-- 详见 项目建设方案/亲子宝典数据闭环-v1.0.md §1.2
-- SSOT 边界：扩展字段全部放 travel-guide.child_profiles，auth-service 不动

-- AlterTable
ALTER TABLE "child_profiles"
  ADD COLUMN "has_student_card"      BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN "id_card_prefix"        TEXT,
  ADD COLUMN "needs_child_ticket"    BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN "stroller_width_cm"     INTEGER,
  ADD COLUMN "comfortable_temp_c"    TEXT,
  ADD COLUMN "fears_animals"         BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN "dietary_restrictions"  TEXT[]      NOT NULL DEFAULT '{}';
