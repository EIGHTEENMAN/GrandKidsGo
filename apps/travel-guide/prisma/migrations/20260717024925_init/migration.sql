-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT,
    "cover_image" TEXT,
    "kid_hook" TEXT,
    "mom_hook" TEXT,
    "dad_hook" TEXT,
    "best_seasons" TEXT[],
    "tags" TEXT[],
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spots" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kid_highlights" TEXT,
    "mom_highlights" TEXT,
    "dad_highlights" TEXT,
    "tips" TEXT,
    "pitfalls" TEXT,
    "recommended_months" INTEGER[],
    "duration_minutes" INTEGER,
    "kid_score" DOUBLE PRECISION,
    "mom_score" DOUBLE PRECISION,
    "dad_score" DOUBLE PRECISION,
    "images" TEXT[],
    "tags" TEXT[],
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "spot_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "has_high_chair" BOOLEAN NOT NULL DEFAULT false,
    "is_kid_tolerant" BOOLEAN NOT NULL DEFAULT false,
    "has_kids_menu" BOOLEAN NOT NULL DEFAULT false,
    "cuisine" TEXT,
    "avg_price_per_person" INTEGER,
    "tags" TEXT[],
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "has_family_room" BOOLEAN NOT NULL DEFAULT false,
    "has_kids_pool" BOOLEAN NOT NULL DEFAULT false,
    "has_kids_breakfast" BOOLEAN NOT NULL DEFAULT false,
    "avg_price_per_night" INTEGER,
    "tags" TEXT[],
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transports" (
    "id" TEXT NOT NULL,
    "from_city_id" TEXT NOT NULL,
    "to_city_id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "price_reference" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parks" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "has_kids_play_area" BOOLEAN NOT NULL DEFAULT false,
    "duration_minutes" INTEGER,
    "tags" TEXT[],
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playgrounds" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age_min_months" INTEGER,
    "age_max_months" INTEGER,
    "duration_minutes" INTEGER,
    "tags" TEXT[],
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playgrounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "malls" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "has_kids_play_area" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "malls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospitals" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "has_pediatrics" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "phone" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "season" TEXT,
    "tags" TEXT[],
    "skeleton" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itinerary_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_travel_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "home_city_id" TEXT,
    "child_ages" INTEGER[],
    "travel_style" TEXT,
    "budget_level" TEXT,
    "preferred_spots" TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_travel_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "city_id" TEXT,
    "source_guide_id" TEXT,
    "source_plan_record_id" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "travelers" JSONB NOT NULL,
    "child_ages" INTEGER[],
    "travel_style" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title" TEXT,
    "timeline_blocks" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_media" (
    "id" TEXT NOT NULL,
    "plan_record_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "oss_key" TEXT NOT NULL,
    "oss_url" TEXT,
    "taken_at" TIMESTAMP(3),
    "spot_id" TEXT,
    "timeline_block_id" TEXT,
    "caption" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "visibility_level" TEXT NOT NULL DEFAULT 'private',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_notes" (
    "id" TEXT NOT NULL,
    "plan_record_id" TEXT NOT NULL,
    "spot_id" TEXT,
    "timeline_block_id" TEXT,
    "text" TEXT NOT NULL,
    "mood" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_ratings" (
    "id" TEXT NOT NULL,
    "plan_record_id" TEXT NOT NULL,
    "timeline_block_id" TEXT,
    "spot_id" TEXT,
    "child_id" TEXT NOT NULL,
    "physical_state" TEXT,
    "emotional_peak" TEXT,
    "stay_duration_minutes" INTEGER,
    "willingness_to_return" TEXT,
    "cry_episodes" JSONB NOT NULL,
    "child_age_at_visit" INTEGER,
    "linked_media_ids" TEXT[],
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_feeling_profiles" (
    "child_id" TEXT NOT NULL,
    "spot_type_preferences" JSONB NOT NULL,
    "average_active_stay_minutes" DOUBLE PRECISION,
    "crying_triggers" JSONB NOT NULL,
    "energy_curve_by_time_of_day" JSONB NOT NULL,
    "average_emotional_peak_distribution" JSONB NOT NULL,
    "total_data_points" INTEGER NOT NULL DEFAULT 0,
    "last_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "privacy_level" TEXT NOT NULL DEFAULT 'anonymized',

    CONSTRAINT "child_feeling_profiles_pkey" PRIMARY KEY ("child_id")
);

-- CreateTable
CREATE TABLE "child_expectations" (
    "id" TEXT NOT NULL,
    "plan_record_id" TEXT NOT NULL,
    "timeline_block_id" TEXT,
    "spot_id" TEXT,
    "child_id" TEXT NOT NULL,
    "expectation_score" DOUBLE PRECISION NOT NULL,
    "expectation_reason" TEXT[],
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "child_expectations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_profiles" (
    "child_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "avatar" TEXT,
    "gender" TEXT,
    "birth_date" TIMESTAMP(3),
    "height_cm" DOUBLE PRECISION,
    "weight_kg" DOUBLE PRECISION,
    "likes" TEXT[],
    "activities" TEXT[],
    "dislikes" TEXT[],
    "active_hours_per_day" DOUBLE PRECISION,
    "need_nap" TEXT NOT NULL DEFAULT 'optional',
    "early_or_late" TEXT,
    "has_motion_sickness" BOOLEAN NOT NULL DEFAULT false,
    "allergies" TEXT[],
    "is_shy_with_strangers" BOOLEAN NOT NULL DEFAULT false,
    "health_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_profiles_pkey" PRIMARY KEY ("child_id")
);

-- CreateTable
CREATE TABLE "guide_drafts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "outline" JSONB,
    "content_html" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "mode" TEXT NOT NULL DEFAULT 'quick',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guide_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guides" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_plan_record_id" TEXT,
    "title" TEXT NOT NULL,
    "cover_images" TEXT[],
    "content_html" TEXT NOT NULL,
    "city_id" TEXT,
    "days" INTEGER,
    "child_ages" INTEGER[],
    "travel_style" TEXT,
    "season" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "save_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_saves" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "guide_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_saves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_likes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "guide_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "followee_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spot_reviews" (
    "id" TEXT NOT NULL,
    "spot_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "child_ages" INTEGER[],
    "visit_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spot_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "cost_cents" INTEGER,
    "companions" JSONB,
    "plan_record_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_badge_defs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "category" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_badge_defs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_badges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "badge_def_id" TEXT NOT NULL,
    "obtained_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plan_record_id" TEXT,

    CONSTRAINT "travel_badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_key" ON "cities"("name");

-- CreateIndex
CREATE INDEX "spots_city_id_idx" ON "spots"("city_id");

-- CreateIndex
CREATE INDEX "spots_spot_type_idx" ON "spots"("spot_type");

-- CreateIndex
CREATE UNIQUE INDEX "spots_city_id_name_key" ON "spots"("city_id", "name");

-- CreateIndex
CREATE INDEX "restaurants_city_id_idx" ON "restaurants"("city_id");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_city_id_name_key" ON "restaurants"("city_id", "name");

-- CreateIndex
CREATE INDEX "hotels_city_id_idx" ON "hotels"("city_id");

-- CreateIndex
CREATE UNIQUE INDEX "hotels_city_id_name_key" ON "hotels"("city_id", "name");

-- CreateIndex
CREATE INDEX "transports_from_city_id_to_city_id_idx" ON "transports"("from_city_id", "to_city_id");

-- CreateIndex
CREATE INDEX "parks_city_id_idx" ON "parks"("city_id");

-- CreateIndex
CREATE INDEX "playgrounds_city_id_idx" ON "playgrounds"("city_id");

-- CreateIndex
CREATE INDEX "malls_city_id_idx" ON "malls"("city_id");

-- CreateIndex
CREATE INDEX "hospitals_city_id_idx" ON "hospitals"("city_id");

-- CreateIndex
CREATE INDEX "itinerary_templates_city_id_idx" ON "itinerary_templates"("city_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_travel_preferences_user_id_key" ON "user_travel_preferences"("user_id");

-- CreateIndex
CREATE INDEX "plan_records_user_id_status_idx" ON "plan_records"("user_id", "status");

-- CreateIndex
CREATE INDEX "plan_records_start_date_idx" ON "plan_records"("start_date");

-- CreateIndex
CREATE INDEX "plan_media_plan_record_id_order_index_idx" ON "plan_media"("plan_record_id", "order_index");

-- CreateIndex
CREATE INDEX "plan_media_spot_id_idx" ON "plan_media"("spot_id");

-- CreateIndex
CREATE INDEX "plan_notes_plan_record_id_idx" ON "plan_notes"("plan_record_id");

-- CreateIndex
CREATE INDEX "child_ratings_plan_record_id_idx" ON "child_ratings"("plan_record_id");

-- CreateIndex
CREATE INDEX "child_ratings_spot_id_child_age_at_visit_idx" ON "child_ratings"("spot_id", "child_age_at_visit");

-- CreateIndex
CREATE INDEX "child_ratings_child_id_idx" ON "child_ratings"("child_id");

-- CreateIndex
CREATE INDEX "child_expectations_plan_record_id_idx" ON "child_expectations"("plan_record_id");

-- CreateIndex
CREATE INDEX "child_expectations_spot_id_idx" ON "child_expectations"("spot_id");

-- CreateIndex
CREATE INDEX "child_profiles_user_id_idx" ON "child_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "child_profiles_user_id_child_id_key" ON "child_profiles"("user_id", "child_id");

-- CreateIndex
CREATE INDEX "guide_drafts_user_id_idx" ON "guide_drafts"("user_id");

-- CreateIndex
CREATE INDEX "guides_status_published_at_idx" ON "guides"("status", "published_at");

-- CreateIndex
CREATE INDEX "guides_city_id_idx" ON "guides"("city_id");

-- CreateIndex
CREATE INDEX "guide_saves_user_id_created_at_idx" ON "guide_saves"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "guide_saves_user_id_guide_id_key" ON "guide_saves"("user_id", "guide_id");

-- CreateIndex
CREATE INDEX "guide_likes_user_id_created_at_idx" ON "guide_likes"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "guide_likes_user_id_guide_id_key" ON "guide_likes"("user_id", "guide_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_follows_follower_id_followee_id_key" ON "user_follows"("follower_id", "followee_id");

-- CreateIndex
CREATE INDEX "spot_reviews_spot_id_idx" ON "spot_reviews"("spot_id");

-- CreateIndex
CREATE INDEX "spot_reviews_status_idx" ON "spot_reviews"("status");

-- CreateIndex
CREATE INDEX "travel_records_user_id_idx" ON "travel_records"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "travel_badge_defs_name_key" ON "travel_badge_defs"("name");

-- CreateIndex
CREATE INDEX "travel_badge_defs_category_idx" ON "travel_badge_defs"("category");

-- CreateIndex
CREATE INDEX "travel_badges_user_id_idx" ON "travel_badges"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "travel_badges_user_id_badge_def_id_key" ON "travel_badges"("user_id", "badge_def_id");

-- AddForeignKey
ALTER TABLE "spots" ADD CONSTRAINT "spots_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transports" ADD CONSTRAINT "transports_from_city_id_fkey" FOREIGN KEY ("from_city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transports" ADD CONSTRAINT "transports_to_city_id_fkey" FOREIGN KEY ("to_city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parks" ADD CONSTRAINT "parks_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playgrounds" ADD CONSTRAINT "playgrounds_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "malls" ADD CONSTRAINT "malls_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospitals" ADD CONSTRAINT "hospitals_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_templates" ADD CONSTRAINT "itinerary_templates_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_records" ADD CONSTRAINT "plan_records_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_records" ADD CONSTRAINT "plan_records_source_guide_id_fkey" FOREIGN KEY ("source_guide_id") REFERENCES "guides"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_media" ADD CONSTRAINT "plan_media_plan_record_id_fkey" FOREIGN KEY ("plan_record_id") REFERENCES "plan_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_media" ADD CONSTRAINT "plan_media_spot_id_fkey" FOREIGN KEY ("spot_id") REFERENCES "spots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_notes" ADD CONSTRAINT "plan_notes_plan_record_id_fkey" FOREIGN KEY ("plan_record_id") REFERENCES "plan_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_notes" ADD CONSTRAINT "plan_notes_spot_id_fkey" FOREIGN KEY ("spot_id") REFERENCES "spots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_ratings" ADD CONSTRAINT "child_ratings_plan_record_id_fkey" FOREIGN KEY ("plan_record_id") REFERENCES "plan_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_ratings" ADD CONSTRAINT "child_ratings_spot_id_fkey" FOREIGN KEY ("spot_id") REFERENCES "spots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_ratings" ADD CONSTRAINT "child_ratings_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "child_feeling_profiles"("child_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_expectations" ADD CONSTRAINT "child_expectations_plan_record_id_fkey" FOREIGN KEY ("plan_record_id") REFERENCES "plan_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_expectations" ADD CONSTRAINT "child_expectations_spot_id_fkey" FOREIGN KEY ("spot_id") REFERENCES "spots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_source_plan_record_id_fkey" FOREIGN KEY ("source_plan_record_id") REFERENCES "plan_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_saves" ADD CONSTRAINT "guide_saves_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_likes" ADD CONSTRAINT "guide_likes_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spot_reviews" ADD CONSTRAINT "spot_reviews_spot_id_fkey" FOREIGN KEY ("spot_id") REFERENCES "spots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_records" ADD CONSTRAINT "travel_records_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_badges" ADD CONSTRAINT "travel_badges_badge_def_id_fkey" FOREIGN KEY ("badge_def_id") REFERENCES "travel_badge_defs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_badges" ADD CONSTRAINT "travel_badges_plan_record_id_fkey" FOREIGN KEY ("plan_record_id") REFERENCES "plan_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
