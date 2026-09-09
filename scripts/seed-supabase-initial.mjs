import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Load .env.local
const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    value = value.trim().replace(/^["']|["']$/g, "");
    env[match[1]] = value;
  }
});

const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Supabase URL or Key not found in .env.local");
  process.exit(1);
}

const sb = createClient(url, key);

async function seed() {
  console.log("🌱 Starting Supabase starter template seeding...");

  // 1. Get family ID
  const { data: families, error: famErr } = await sb.from("families").select("id").limit(1);
  if (famErr || !families || families.length === 0) {
    console.error("No family found in Supabase:", famErr?.message);
    return;
  }
  const familyId = families[0].id;
  console.log(`Found Family ID: ${familyId}`);

  // 2. Seed Assets (Allowed: real_estate, vehicle, gold, electronics, investment, other)
  const { count: assetCount } = await sb.from("assets").select("*", { count: "exact", head: true });
  if (!assetCount || assetCount === 0) {
    const initialAssets = [
      {
        family_id: familyId,
        name: "Emas Batangan Antam (20g)",
        category: "gold",
        estimated_value: 28000000,
        acquisition_date: "2025-06-15",
        notes: "Logam mulia simpanan jangka panjang keluarga di safe deposit box",
        metadata: { weight_grams: 20, purity: "99.99%" },
      },
      {
        family_id: familyId,
        name: "Tabungan Reksa Dana / Pasar Uang",
        category: "investment",
        estimated_value: 15000000,
        acquisition_date: "2026-01-01",
        notes: "Alokasi dana darurat likuid untuk kebutuhan mendesak keluarga",
        metadata: { product: "Reksadana Pasar Uang", platform: "Bibit" },
      },
    ];
    const { error: aErr } = await sb.from("assets").insert(initialAssets);
    if (aErr) console.warn("Seed assets error:", aErr.message);
    else console.log("✅ Seeded initial assets");
  } else {
    console.log(`ℹ️ Assets already exist (count: ${assetCount})`);
  }

  // 3. Seed Liabilities
  const { count: liabCount } = await sb.from("liabilities").select("*", { count: "exact", head: true });
  if (!liabCount || liabCount === 0) {
    const initialLiabilities = [
      {
        family_id: familyId,
        name: "KPR Rumah Tinggal",
        type: "mortgage",
        total_amount: 500000000,
        remaining_amount: 350000000,
        monthly_installment: 3800000,
        due_date_day: 10,
        notes: "Cicilan rumah tinggal di Bank BTN Syariah",
      },
    ];
    const { error: lErr } = await sb.from("liabilities").insert(initialLiabilities);
    if (lErr) console.warn("Seed liabilities error:", lErr.message);
    else console.log("✅ Seeded initial liabilities");
  } else {
    console.log(`ℹ️ Liabilities already exist (count: ${liabCount})`);
  }

  // 4. Seed Documents (Table is named 'documents', notes stored in metadata)
  const { count: docCount } = await sb.from("documents").select("*", { count: "exact", head: true });
  if (!docCount || docCount <= 1) {
    const initialDocs = [
      {
        family_id: familyId,
        title: "Kartu Keluarga (KK)",
        category: "identity",
        document_number: "3201012304900001",
        expiry_date: "2035-12-31",
        reminder_days_before: 30,
        metadata: { notes: "Salinan resmi Kartu Keluarga untuk administrasi" },
      },
      {
        family_id: familyId,
        title: "Polis Asuransi Kesehatan Keluarga",
        category: "insurance",
        document_number: "POL-2026-8891",
        expiry_date: "2027-12-31",
        reminder_days_before: 30,
        metadata: { notes: "Polis proteksi kesehatan rawat inap keluarga" },
      },
    ];
    const { error: dErr } = await sb.from("documents").insert(initialDocs);
    if (dErr) console.warn("Seed documents error:", dErr.message);
    else console.log("✅ Seeded initial documents");
  } else {
    console.log(`ℹ️ Documents already exist (count: ${docCount})`);
  }

  console.log("🎉 Seeding completed successfully!");
}

seed();
