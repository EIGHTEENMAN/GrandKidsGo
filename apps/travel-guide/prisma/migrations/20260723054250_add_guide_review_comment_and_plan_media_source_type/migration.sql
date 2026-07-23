-- AlterTable
ALTER TABLE "plan_media" ADD COLUMN     "child_id" TEXT,
ADD COLUMN     "source_type" TEXT NOT NULL DEFAULT 'plan';

-- CreateTable
CREATE TABLE "guide_reviews" (
    "id" TEXT NOT NULL,
    "guide_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "adult_rating" INTEGER NOT NULL,
    "child_rating" INTEGER,
    "child_age_months" INTEGER,
    "text" TEXT,
    "tags" TEXT[],
    "visit_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_comments" (
    "id" TEXT NOT NULL,
    "guide_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guide_reviews_guide_id_created_at_idx" ON "guide_reviews"("guide_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "guide_reviews_status_idx" ON "guide_reviews"("status");

-- CreateIndex
CREATE INDEX "guide_comments_guide_id_created_at_idx" ON "guide_comments"("guide_id", "created_at" DESC);
