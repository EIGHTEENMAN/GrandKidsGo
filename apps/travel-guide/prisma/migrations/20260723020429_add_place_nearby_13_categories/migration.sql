-- CreateEnum
CREATE TYPE "PlaceNearbyCategory" AS ENUM ('KID_RESTAURANT', 'NURSING_ROOM', 'TAP_WATER', 'CONVENIENCE', 'TOY_STORE', 'BOOKSTORE', 'KIDS_HOSPITAL', 'PHARMACY', 'MATERNITY_STORE', 'DIDI_PICKUP', 'TAXI_STAND', 'KID_HOTEL', 'STROLLER_FRIENDLY');

-- CreateTable
CREATE TABLE "place_nearby" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "place_type" TEXT NOT NULL,
    "category" "PlaceNearbyCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "distance_meters" INTEGER,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "source" TEXT NOT NULL DEFAULT 'mock',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "place_nearby_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "place_nearby_place_id_place_type_category_idx" ON "place_nearby"("place_id", "place_type", "category");

-- CreateIndex
CREATE INDEX "place_nearby_category_idx" ON "place_nearby"("category");
