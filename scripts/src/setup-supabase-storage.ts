/**
 * Sets up the Supabase Storage bucket required by the CULTIVE mobile app.
 *
 * Run with:
 *   SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> pnpm --filter @workspace/scripts run setup-storage
 *
 * The SUPABASE_SERVICE_ROLE_KEY is required — the anon key does not have
 * permission to create or configure storage buckets.
 *
 * This script is idempotent: safe to re-run if the bucket already exists.
 */

import { createClient } from "@supabase/supabase-js";

const BUCKET_NAME = "submission-images";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing required env vars: SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log(`Checking bucket "${BUCKET_NAME}"…`);

  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error("Failed to list buckets:", listErr.message);
    process.exit(1);
  }

  const existing = buckets?.find((b) => b.name === BUCKET_NAME);

  if (existing) {
    console.log(`Bucket "${BUCKET_NAME}" already exists (id: ${existing.id}).`);

    if (!existing.public) {
      console.log("Bucket is private — updating to public…");
      const { error: updateErr } = await supabase.storage.updateBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"],
        fileSizeLimit: 10 * 1024 * 1024,
      });
      if (updateErr) {
        console.error("Failed to update bucket:", updateErr.message);
        process.exit(1);
      }
      console.log(`Bucket "${BUCKET_NAME}" is now public.`);
    } else {
      console.log(`Bucket "${BUCKET_NAME}" is already public. Nothing to do.`);
    }
  } else {
    console.log(`Bucket "${BUCKET_NAME}" not found — creating…`);
    const { error: createErr } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"],
      fileSizeLimit: 10 * 1024 * 1024,
    });
    if (createErr) {
      console.error("Failed to create bucket:", createErr.message);
      process.exit(1);
    }
    console.log(`Bucket "${BUCKET_NAME}" created successfully (public, max 10 MB).`);
  }

  console.log("\nDone. Summary:");
  console.log(`  Bucket name : ${BUCKET_NAME}`);
  console.log(`  Public reads: yes`);
  console.log(`  Allowed types: jpeg, jpg, png, webp, heic`);
  console.log(`  Max file size: 10 MB`);
}

main();
