/**
 * Idempotent VIP plan seed.
 *
 * Usage: npm run seed:vip
 *
 * - Connects to MongoDB (MONGODB_URI from .env.local / .env)
 * - Upserts exactly VIP 1–8 (one document per level; unique level index)
 * - Running it repeatedly never creates duplicates
 * - Closes the connection cleanly on success or failure
 */

import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

// ── Tiny .env loader (scripts don't go through Next.js) ─────────────────────
function loadEnvFile(fileName: string): void {
  const filePath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

// ── The EXACT 8 plans (single source of truth for seeding) ──────────────────
const VIP_PLANS = [
  { level: 1, name: "VIP 1", depositAmount: 100, dailyIncome: 3, dailyTasksRequired: 2 },
  { level: 2, name: "VIP 2", depositAmount: 250, dailyIncome: 7.5, dailyTasksRequired: 4 },
  { level: 3, name: "VIP 3", depositAmount: 500, dailyIncome: 15, dailyTasksRequired: 6 },
  { level: 4, name: "VIP 4", depositAmount: 1000, dailyIncome: 30, dailyTasksRequired: 8 },
  { level: 5, name: "VIP 5", depositAmount: 2500, dailyIncome: 75, dailyTasksRequired: 10 },
  { level: 6, name: "VIP 6", depositAmount: 5000, dailyIncome: 150, dailyTasksRequired: 12 },
  { level: 7, name: "VIP 7", depositAmount: 10000, dailyIncome: 300, dailyTasksRequired: 14 },
  { level: 8, name: "VIP 8", depositAmount: 20000, dailyIncome: 600, dailyTasksRequired: 16 },
] as const;

interface SeedDoc {
  level: number;
  name: string;
  depositAmount: number;
  dailyIncome: number;
  dailyTasksRequired: number;
  isActive: boolean;
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      "✗ MONGODB_URI is not set. Copy .env.example to .env.local first.",
    );
    process.exitCode = 1;
    return;
  }

  console.log("Connecting to MongoDB…");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8_000 });

  const VIPPlan = mongoose.connection.collection("vip_plans");

  // Ensure the unique level index exists BEFORE upserting so concurrent runs
  // can never create duplicate levels. (createIndex is a no-op if it exists.)
  await VIPPlan.createIndex({ level: 1 }, { unique: true });

  let inserted = 0;
  let updated = 0;

  for (const plan of VIP_PLANS) {
    const doc: SeedDoc = { ...plan, isActive: true };
    const result = await VIPPlan.updateOne(
      { level: doc.level },
      { $set: doc },
      { upsert: true },
    );
    if (result.upsertedCount) inserted += 1;
    else if (result.modifiedCount) updated += 1;
  }

  const total = await VIPPlan.countDocuments();

  console.log(
    `✅ VIP plans seeded — inserted: ${inserted}, updated: ${updated}, total in DB: ${total}/8`,
  );

  if (total !== 8) {
    console.error(
      `✗ Expected exactly 8 plans but found ${total}. Check for stray documents.`,
    );
    process.exitCode = 1;
  }
}

main()
  .then(async () => {
    await mongoose.disconnect();
    console.log("Connection closed.");
  })
  .catch(async (error) => {
    console.error("✗ Seed failed:", error instanceof Error ? error.message : error);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
  });
