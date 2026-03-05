ALTER TABLE "showcase_videos" ADD COLUMN "source" text DEFAULT 'youtube' NOT NULL;--> statement-breakpoint
ALTER TABLE "showcase_videos" ADD COLUMN "storage_blob_key" text;--> statement-breakpoint
ALTER TABLE "showcase_videos" ADD COLUMN "storage_blob_url" text;--> statement-breakpoint
ALTER TABLE "showcase_videos" ALTER COLUMN "youtube_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "showcase_videos" ALTER COLUMN "youtube_video_id" DROP NOT NULL;
