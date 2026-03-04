CREATE TYPE "public"."app_role" AS ENUM('owner', 'admin');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('info', 'phase1', 'phase2', 'system', 'referral');--> statement-breakpoint
CREATE TYPE "public"."phase1_reject_reason" AS ENUM('bad_accent', 'bad_pronunciation', 'low_energy');--> statement-breakpoint
CREATE TYPE "public"."phase1_status" AS ENUM('pending', 'rejected', 'moved_to_phase2');--> statement-breakpoint
CREATE TYPE "public"."phase2_submission_status" AS ENUM('submitted', 'accepted', 'retry', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."phase2_task_status" AS ENUM('assigned', 'submitted', 'accepted', 'retry', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."referral_reward_status" AS ENUM('pending', 'approved', 'paid');--> statement-breakpoint
CREATE TYPE "public"."training_video_category" AS ENUM('about_us', 'bright_sample', 'tips');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" "app_role" DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text,
	"event_name" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"date_of_birth" date,
	"age" integer,
	"short_about" varchar(50),
	"referral_code" text NOT NULL,
	"referred_by_code" text,
	"current_phase" text DEFAULT 'phase1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "profiles_referral_code_unique" UNIQUE("referral_code"),
	CONSTRAINT "uq_profiles_email" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "referral_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" text NOT NULL,
	"referred_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_links_referred_id_unique" UNIQUE("referred_id"),
	CONSTRAINT "uq_referral_links_pair" UNIQUE("referrer_id","referred_id")
);
--> statement-breakpoint
CREATE TABLE "referral_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" text NOT NULL,
	"referred_id" text NOT NULL,
	"amount_eur" numeric(10, 2) DEFAULT '20.00' NOT NULL,
	"status" "referral_reward_status" DEFAULT 'pending' NOT NULL,
	"eligible_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "referral_rewards_referred_id_unique" UNIQUE("referred_id")
);
--> statement-breakpoint
CREATE TABLE "showcase_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"youtube_url" text NOT NULL,
	"youtube_video_id" text NOT NULL,
	"thumbnail_url" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "teacher_phase1_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"attempt_no" smallint NOT NULL,
	"video_blob_key" text NOT NULL,
	"video_blob_url" text NOT NULL,
	"script_text" text DEFAULT 'Please introduce yourself in 4-5 sentences.' NOT NULL,
	"status" "phase1_status" DEFAULT 'pending' NOT NULL,
	"reject_reason" "phase1_reject_reason",
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"storage_deleted_at" timestamp with time zone,
	CONSTRAINT "uq_phase1_user_attempt" UNIQUE("user_id","attempt_no")
);
--> statement-breakpoint
CREATE TABLE "teacher_phase2_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"attempt_no" smallint NOT NULL,
	"video_blob_key" text NOT NULL,
	"video_blob_url" text NOT NULL,
	"status" "phase2_submission_status" DEFAULT 'submitted' NOT NULL,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"storage_deleted_at" timestamp with time zone,
	CONSTRAINT "uq_phase2_task_attempt" UNIQUE("task_id","attempt_no")
);
--> statement-breakpoint
CREATE TABLE "teacher_phase2_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"phase2_sentence" text NOT NULL,
	"status" "phase2_task_status" DEFAULT 'assigned' NOT NULL,
	"attempts_allowed" smallint DEFAULT 3 NOT NULL,
	"current_attempts" smallint DEFAULT 0 NOT NULL,
	"last_feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"created_by" text,
	CONSTRAINT "teacher_phase2_tasks_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "teacher_training_video_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"training_video_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_training_views_user_video" UNIQUE("user_id","training_video_id")
);
--> statement-breakpoint
CREATE TABLE "training_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"category" "training_video_category" NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"storage_blob_key" text NOT NULL,
	"storage_blob_url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_referrer_id_profiles_user_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_referred_id_profiles_user_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referrer_id_profiles_user_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referred_id_profiles_user_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_phase1_submissions" ADD CONSTRAINT "teacher_phase1_submissions_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_phase2_submissions" ADD CONSTRAINT "teacher_phase2_submissions_task_id_teacher_phase2_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."teacher_phase2_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_phase2_submissions" ADD CONSTRAINT "teacher_phase2_submissions_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_phase2_tasks" ADD CONSTRAINT "teacher_phase2_tasks_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_training_video_views" ADD CONSTRAINT "teacher_training_video_views_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_training_video_views" ADD CONSTRAINT "teacher_training_video_views_training_video_id_training_videos_id_fk" FOREIGN KEY ("training_video_id") REFERENCES "public"."training_videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_admin_users_role" ON "admin_users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_analytics_event_name_created" ON "analytics_events" USING btree ("event_name","created_at");--> statement-breakpoint
CREATE INDEX "idx_analytics_session_created" ON "analytics_events" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "notifications" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "idx_profiles_current_phase" ON "profiles" USING btree ("current_phase");--> statement-breakpoint
CREATE INDEX "idx_profiles_created_at" ON "profiles" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_referral_links_referrer" ON "referral_links" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "idx_referral_rewards_status" ON "referral_rewards" USING btree ("status","eligible_at");--> statement-breakpoint
CREATE INDEX "idx_showcase_videos_active_order" ON "showcase_videos" USING btree ("is_active","order_index","created_at");--> statement-breakpoint
CREATE INDEX "idx_phase1_user_created" ON "teacher_phase1_submissions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_phase1_status_created" ON "teacher_phase1_submissions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_phase1_status_deleted_created" ON "teacher_phase1_submissions" USING btree ("status","is_deleted","created_at");--> statement-breakpoint
CREATE INDEX "idx_phase2_submissions_task_created" ON "teacher_phase2_submissions" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_phase2_submissions_user_created" ON "teacher_phase2_submissions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_phase2_submissions_task_deleted_attempt" ON "teacher_phase2_submissions" USING btree ("task_id","is_deleted","attempt_no");--> statement-breakpoint
CREATE INDEX "idx_phase2_tasks_status_updated" ON "teacher_phase2_tasks" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "idx_training_video_views_user" ON "teacher_training_video_views" USING btree ("user_id","viewed_at");--> statement-breakpoint
CREATE INDEX "idx_training_videos_active_order" ON "training_videos" USING btree ("is_active","category","order_index");