-- AlterTable
ALTER TABLE "hospitals" ADD COLUMN     "cover_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "official_site" TEXT,
ADD COLUMN     "open_hours" TEXT;

-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "address" TEXT,
ADD COLUMN     "cover_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "official_site" TEXT,
ADD COLUMN     "open_hours" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "malls" ADD COLUMN     "address" TEXT,
ADD COLUMN     "cover_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "official_site" TEXT,
ADD COLUMN     "open_hours" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "parks" ADD COLUMN     "address" TEXT,
ADD COLUMN     "cover_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "official_site" TEXT,
ADD COLUMN     "open_hours" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "playgrounds" ADD COLUMN     "address" TEXT,
ADD COLUMN     "cover_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "official_site" TEXT,
ADD COLUMN     "open_hours" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "address" TEXT,
ADD COLUMN     "cover_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "official_site" TEXT,
ADD COLUMN     "open_hours" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "spots" ADD COLUMN     "address" TEXT,
ADD COLUMN     "cover_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "official_site" TEXT,
ADD COLUMN     "open_hours" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "ticket_price" TEXT;
