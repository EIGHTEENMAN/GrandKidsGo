-- CreateEnum
CREATE TYPE "PoemLinkType" AS ENUM ('EXACT_CITY', 'LANDMARK', 'AUTHOR_HOMETOWN', 'AUTHOR_POSTING', 'SCENE');

-- CreateTable
CREATE TABLE "child_sayings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "child_id" TEXT,
    "text" TEXT NOT NULL,
    "mood" TEXT,
    "spot_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "source_guide_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'published',
    "share_scope" TEXT NOT NULL DEFAULT 'private',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_sayings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poem_locations" (
    "id" TEXT NOT NULL,
    "poemId" INTEGER NOT NULL,
    "poem_title" TEXT NOT NULL,
    "poem_author" TEXT NOT NULL,
    "link_type" "PoemLinkType" NOT NULL,
    "place_type" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "place_name" TEXT NOT NULL,
    "city_id" TEXT,
    "verse_line" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 3,
    "source" TEXT NOT NULL DEFAULT 'ai_draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poem_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "child_sayings_child_id_created_at_idx" ON "child_sayings"("child_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "child_sayings_share_scope_created_at_idx" ON "child_sayings"("share_scope", "created_at" DESC);

-- CreateIndex
CREATE INDEX "child_sayings_spot_id_created_at_idx" ON "child_sayings"("spot_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "poem_locations_poemId_idx" ON "poem_locations"("poemId");

-- CreateIndex
CREATE INDEX "poem_locations_place_type_place_id_idx" ON "poem_locations"("place_type", "place_id");

-- CreateIndex
CREATE INDEX "poem_locations_city_id_idx" ON "poem_locations"("city_id");

-- CreateIndex
CREATE UNIQUE INDEX "poem_locations_poemId_link_type_place_type_place_id_key" ON "poem_locations"("poemId", "link_type", "place_type", "place_id");
