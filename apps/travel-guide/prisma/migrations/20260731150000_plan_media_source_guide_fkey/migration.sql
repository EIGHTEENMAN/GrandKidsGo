-- 2026-07-31 v1.0：PlanMedia.sourceGuideId 外键约束
-- 背景：Phase D 攻略图片自动提取（commit 065f82b）加了 sourceGuideId 列
--       但当时只用 db execute --stdin 跑了 ALTER TABLE 漏了 FK 约束
--       Prisma migrate diff 检测到缺失，加此 migration 收尾

-- AddForeignKey
ALTER TABLE "plan_media"
  ADD CONSTRAINT "plan_media_source_guide_id_fkey"
  FOREIGN KEY ("source_guide_id") REFERENCES "guides"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;