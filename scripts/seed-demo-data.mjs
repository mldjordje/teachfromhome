import { sql } from "@vercel/postgres";

const ensureEnv = () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL nije podešen.");
  }
};

const nowIso = () => new Date().toISOString();

const profiles = [
  {
    userId: "google:demo_pending",
    email: "demo.pending@teachfromhome.app",
    firstName: "Ana",
    lastName: "Jović",
    phone: "+38160111222",
    referralCode: "DEMOPEND01",
    currentPhase: "phase1",
  },
  {
    userId: "google:demo_rejected",
    email: "demo.rejected@teachfromhome.app",
    firstName: "Luka",
    lastName: "Marković",
    phone: "+38160111333",
    referralCode: "DEMOREJ002",
    currentPhase: "phase1",
  },
  {
    userId: "google:demo_phase2",
    email: "demo.phase2@teachfromhome.app",
    firstName: "Milica",
    lastName: "Petrović",
    phone: "+38160111444",
    referralCode: "DEMOPH2003",
    currentPhase: "phase2",
  },
  {
    userId: "google:demo_accepted",
    email: "demo.accepted@teachfromhome.app",
    firstName: "Nikola",
    lastName: "Ilić",
    phone: "+38160111555",
    referralCode: "DEMOACC004",
    currentPhase: "accepted",
  },
  {
    userId: "google:demo_admin",
    email: "demo.admin@teachfromhome.app",
    firstName: "Admin",
    lastName: "Demo",
    phone: "+38160111666",
    referralCode: "DEMOADM005",
    currentPhase: "phase1",
  },
];

const seedProfiles = async () => {
  for (const row of profiles) {
    await sql`
      insert into profiles (user_id, email, first_name, last_name, phone, referral_code, current_phase, updated_at)
      values (${row.userId}, ${row.email}, ${row.firstName}, ${row.lastName}, ${row.phone}, ${row.referralCode}, ${row.currentPhase}, now())
      on conflict (user_id) do update set
        email = excluded.email,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        phone = excluded.phone,
        referral_code = excluded.referral_code,
        current_phase = excluded.current_phase,
        updated_at = now();
    `;
  }
};

const seedAdminUser = async () => {
  await sql`
    insert into admin_users (user_id, role)
    values (${"google:demo_admin"}, ${"admin"})
    on conflict (user_id) do update set role = excluded.role;
  `;
};

const seedPhase1 = async () => {
  await sql`
    insert into teacher_phase1_submissions (id, user_id, attempt_no, video_blob_key, video_blob_url, script_text, status, created_at)
    values
      (${"11111111-1111-4111-8111-111111111111"}, ${"google:demo_pending"}, 1, ${"phase1/demo_pending.mp4"}, ${"https://example.com/phase1/demo_pending.mp4"}, ${"My name is Ana and I enjoy teaching children online."}, ${"pending"}, now() - interval '2 hour'),
      (${"22222222-2222-4222-8222-222222222222"}, ${"google:demo_rejected"}, 1, ${"phase1/demo_rejected.mp4"}, ${"https://example.com/phase1/demo_rejected.mp4"}, ${"My name is Luka and I have classroom teaching experience."}, ${"rejected"}, now() - interval '1 day'),
      (${"33333333-3333-4333-8333-333333333333"}, ${"google:demo_phase2"}, 1, ${"phase1/demo_phase2.mp4"}, ${"https://example.com/phase1/demo_phase2.mp4"}, ${"My name is Milica and I love communication practice."}, ${"moved_to_phase2"}, now() - interval '2 day')
    on conflict on constraint uq_phase1_user_attempt do update set
      status = excluded.status,
      script_text = excluded.script_text,
      video_blob_key = excluded.video_blob_key,
      video_blob_url = excluded.video_blob_url,
      updated_at = now();
  `;
};

const seedPhase2 = async () => {
  await sql`
    insert into teacher_phase2_tasks (id, user_id, phase2_sentence, status, attempts_allowed, current_attempts, last_feedback, created_by, updated_at)
    values
      (${"44444444-4444-4444-8444-444444444444"}, ${"google:demo_phase2"}, ${"The quick brown fox jumps over the lazy dog."}, ${"submitted"}, 3, 1, ${null}, ${"google:demo_admin"}, now()),
      (${"55555555-5555-4555-8555-555555555555"}, ${"google:demo_accepted"}, ${"Teaching online requires patience, clarity, and positive energy."}, ${"accepted"}, 3, 1, ${"Great pace and pronunciation."}, ${"google:demo_admin"}, now())
    on conflict (user_id) do update set
      phase2_sentence = excluded.phase2_sentence,
      status = excluded.status,
      attempts_allowed = excluded.attempts_allowed,
      current_attempts = excluded.current_attempts,
      last_feedback = excluded.last_feedback,
      updated_at = now();
  `;

  await sql`
    insert into teacher_phase2_submissions (id, task_id, user_id, attempt_no, video_blob_key, video_blob_url, status, feedback, created_at)
    values
      (${"66666666-6666-4666-8666-666666666666"}, ${"44444444-4444-4444-8444-444444444444"}, ${"google:demo_phase2"}, 1, ${"phase2/demo_phase2.mp4"}, ${"https://example.com/phase2/demo_phase2.mp4"}, ${"submitted"}, ${null}, now() - interval '1 hour'),
      (${"77777777-7777-4777-8777-777777777777"}, ${"55555555-5555-4555-8555-555555555555"}, ${"google:demo_accepted"}, 1, ${"phase2/demo_accepted.mp4"}, ${"https://example.com/phase2/demo_accepted.mp4"}, ${"accepted"}, ${"Excellent clarity."}, now() - interval '3 day')
    on conflict on constraint uq_phase2_task_attempt do update set
      status = excluded.status,
      feedback = excluded.feedback,
      video_blob_key = excluded.video_blob_key,
      video_blob_url = excluded.video_blob_url;
  `;
};

const seedTrainingVideos = async () => {
  await sql`
    insert into training_videos (id, title, category, order_index, storage_blob_key, storage_blob_url, is_active, created_by)
    values
      (${"88888888-8888-4888-8888-888888888888"}, ${"Uvod u TeachFromHome"}, ${"about_us"}, 1, ${"training/about-us.mp4"}, ${"https://example.com/training/about-us.mp4"}, true, ${"google:demo_admin"}),
      (${"99999999-9999-4999-8999-999999999999"}, ${"Bright sample lekcija"}, ${"bright_sample"}, 2, ${"training/bright-sample.mp4"}, ${"https://example.com/training/bright-sample.mp4"}, true, ${"google:demo_admin"}),
      (${"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}, ${"Saveti za energiju"}, ${"tips"}, 3, ${"training/tips.mp4"}, ${"https://example.com/training/tips.mp4"}, true, ${"google:demo_admin"})
    on conflict (id) do update set
      title = excluded.title,
      category = excluded.category,
      order_index = excluded.order_index,
      storage_blob_key = excluded.storage_blob_key,
      storage_blob_url = excluded.storage_blob_url,
      is_active = excluded.is_active,
      updated_at = now();
  `;
};

const seedShowcaseVideos = async () => {
  await sql`
    insert into showcase_videos (id, title, youtube_url, youtube_video_id, thumbnail_url, order_index, is_active, created_by)
    values
      (${"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}, ${"Showcase kandidat 1"}, ${"https://www.youtube.com/watch?v=ysz5S6PUM-U"}, ${"ysz5S6PUM-U"}, ${"https://img.youtube.com/vi/ysz5S6PUM-U/hqdefault.jpg"}, 1, true, ${"google:demo_admin"}),
      (${"cccccccc-cccc-4ccc-8ccc-cccccccccccc"}, ${"Showcase kandidat 2"}, ${"https://www.youtube.com/watch?v=jNQXAC9IVRw"}, ${"jNQXAC9IVRw"}, ${"https://img.youtube.com/vi/jNQXAC9IVRw/hqdefault.jpg"}, 2, true, ${"google:demo_admin"}),
      (${"dddddddd-dddd-4ddd-8ddd-dddddddddddd"}, ${"Showcase kandidat 3"}, ${"https://www.youtube.com/watch?v=oUFJJNQGwhk"}, ${"oUFJJNQGwhk"}, ${"https://img.youtube.com/vi/oUFJJNQGwhk/hqdefault.jpg"}, 3, true, ${"google:demo_admin"})
    on conflict (id) do update set
      title = excluded.title,
      youtube_url = excluded.youtube_url,
      youtube_video_id = excluded.youtube_video_id,
      thumbnail_url = excluded.thumbnail_url,
      order_index = excluded.order_index,
      is_active = excluded.is_active,
      updated_at = now();
  `;
};

const run = async () => {
  ensureEnv();
  console.log(`[seed-demo] start ${nowIso()}`);

  await seedProfiles();
  await seedAdminUser();
  await seedPhase1();
  await seedPhase2();
  await seedTrainingVideos();
  await seedShowcaseVideos();

  console.log(`[seed-demo] done ${nowIso()}`);
};

run().catch((error) => {
  console.error("[seed-demo] failed", error);
  process.exitCode = 1;
});
