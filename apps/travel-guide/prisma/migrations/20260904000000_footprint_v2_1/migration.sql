-- 2026-09-04 v2.1 — 足迹地图：新增 footprints 表
-- 详见 项目建设方案/走天下三大用户功能-v1.0.md §1.1
-- 不依赖 AMAP_JS_KEY：数据层先行，前端地图组件等 key 到位后上线

-- CreateTable
CREATE TABLE "footprints" (
    "id"          TEXT NOT NULL,
    "user_id"     TEXT NOT NULL,
    "child_id"    TEXT,
    "city_id"     TEXT,
    "spot_id"     TEXT,
    "place_name"  TEXT,
    "lat"         DOUBLE PRECISION,
    "lng"         DOUBLE PRECISION,
    "state"       TEXT NOT NULL DEFAULT 'visited',
    "source"      TEXT NOT NULL DEFAULT 'manual',
    "source_id"   TEXT,
    "checkin_at"  TIMESTAMP(3),
    "note"        TEXT,
    "visibility"  TEXT NOT NULL DEFAULT 'private',
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "footprints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex（uniqueness + 多个查询索引）
CREATE UNIQUE INDEX "footprint_uniq" ON "footprints"("user_id", "child_id", "city_id", "spot_id", "state");
CREATE INDEX "footprints_user_id_state_idx" ON "footprints"("user_id", "state");
CREATE INDEX "footprints_city_id_idx" ON "footprints"("city_id");
CREATE INDEX "footprints_spot_id_idx" ON "footprints"("spot_id");
CREATE INDEX "footprints_child_id_idx" ON "footprints"("child_id");
CREATE INDEX "footprints_created_at_idx" ON "footprints"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "footprints" ADD CONSTRAINT "footprints_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "footprints" ADD CONSTRAINT "footprints_spot_id_fkey" FOREIGN KEY ("spot_id") REFERENCES "spots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "footprints" ADD CONSTRAINT "footprints_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "child_profiles"("child_id") ON DELETE SET NULL ON UPDATE CASCADE;
