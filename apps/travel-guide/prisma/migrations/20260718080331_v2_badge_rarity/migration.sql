-- AlterTable
ALTER TABLE "travel_badge_defs" ADD COLUMN     "hidden_flag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rarity" TEXT NOT NULL DEFAULT 'bronze',
ADD COLUMN     "seasonal_tag" TEXT,
ADD COLUMN     "tier" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "travel_badges" ADD COLUMN     "exchanged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "exchanged_at" TIMESTAMP(3),
ADD COLUMN     "share_scope" TEXT NOT NULL DEFAULT 'private',
ADD COLUMN     "shared_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "travel_badge_defs_rarity_idx" ON "travel_badge_defs"("rarity");

-- CreateIndex
CREATE INDEX "travel_badge_defs_hidden_flag_idx" ON "travel_badge_defs"("hidden_flag");

-- CreateIndex
CREATE INDEX "travel_badges_share_scope_idx" ON "travel_badges"("share_scope");

-- CreateIndex
CREATE INDEX "travel_badges_exchanged_idx" ON "travel_badges"("exchanged");
