-- AlterTable
ALTER TABLE "child_sayings" ADD COLUMN     "voice_duration" INTEGER,
ADD COLUMN     "voice_mime" TEXT,
ADD COLUMN     "voice_oss_key" TEXT,
ADD COLUMN     "voice_reject_reason" TEXT,
ADD COLUMN     "voice_reviewed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "child_sayings_status_created_at_idx" ON "child_sayings"("status", "created_at" DESC);
