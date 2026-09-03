/**
 * F&R Family Hub — Microsecond Indonesian Financial Text Fast-Path Parser
 * Accurately extracts transactions from everyday Indonesian chat patterns
 * without making cloud LLM calls, providing sub-second (< 0.8s) response times.
 */

export interface FastParsedTransaction {
  confidence: number;
  type: "expense" | "income";
  amount: number;
  category: string;
  wallet_hint?: string | null;
  description: string;
}

const WALLET_KEYWORDS: { [key: string]: string } = {
  bca: "BCA",
  mandiri: "Mandiri",
  bri: "BRI",
  bni: "BNI",
  bsi: "BSI",
  cimb: "CIMB",
  jago: "Bank Jago",
  jenius: "Jenius",
  gopay: "GoPay",
  ovo: "OVO",
  dana: "DANA",
  shopeepay: "ShopeePay",
  shopee: "ShopeePay",
  linkaja: "LinkAja",
  cash: "Tunai",
  tunai: "Tunai",
  dompet: "Dompet Tunai",
};

const CATEGORY_MAP: { [keyword: string]: string } = {
  // Makanan & Minuman
  kopi: "Makanan & Minuman",
  cafe: "Makanan & Minuman",
  resto: "Makanan & Minuman",
  makan: "Makanan & Minuman",
  nasi: "Makanan & Minuman",
  mie: "Makanan & Minuman",
  bakso: "Makanan & Minuman",
  ayam: "Makanan & Minuman",
  sate: "Makanan & Minuman",
  jajan: "Makanan & Minuman",
  snack: "Makanan & Minuman",
  sarapan: "Makanan & Minuman",
  dinner: "Makanan & Minuman",
  lunch: "Makanan & Minuman",

  // Belanja Bulanan / Groceries
  beras: "Belanja Bulanan / Groceries",
  minyak: "Belanja Bulanan / Groceries",
  telur: "Belanja Bulanan / Groceries",
  sayur: "Belanja Bulanan / Groceries",
  buah: "Belanja Bulanan / Groceries",
  daging: "Belanja Bulanan / Groceries",
  sabun: "Belanja Bulanan / Groceries",
  shampo: "Belanja Bulanan / Groceries",
  superindo: "Belanja Bulanan / Groceries",
  alfamart: "Belanja Bulanan / Groceries",
  indomaret: "Belanja Bulanan / Groceries",
  hypermart: "Belanja Bulanan / Groceries",
  pasar: "Belanja Bulanan / Groceries",
  sembako: "Belanja Bulanan / Groceries",
  popok: "Belanja Bulanan / Groceries",
  pampers: "Belanja Bulanan / Groceries",
  susu: "Belanja Bulanan / Groceries",

  // Transportasi & Bensin
  bensin: "Transportasi & Bensin",
  bbm: "Transportasi & Bensin",
  pertalite: "Transportasi & Bensin",
  pertamax: "Transportasi & Bensin",
  solar: "Transportasi & Bensin",
  shell: "Transportasi & Bensin",
  spbu: "Transportasi & Bensin",
  parkir: "Transportasi & Bensin",
  tol: "Transportasi & Bensin",
  ojol: "Transportasi & Bensin",
  gojek: "Transportasi & Bensin",
  grab: "Transportasi & Bensin",
  maxim: "Transportasi & Bensin",
  servis: "Transportasi & Bensin",
  bengkel: "Transportasi & Bensin",
  cuci: "Transportasi & Bensin",

  // Tagihan & Utilitas
  listrik: "Tagihan & Utilitas",
  pln: "Tagihan & Utilitas",
  token: "Tagihan & Utilitas",
  air: "Tagihan & Utilitas",
  pdam: "Tagihan & Utilitas",
  wifi: "Tagihan & Utilitas",
  indihome: "Tagihan & Utilitas",
  biznet: "Tagihan & Utilitas",
  pulsa: "Tagihan & Utilitas",
  kuota: "Tagihan & Utilitas",
  iuran: "Tagihan & Utilitas",
  ipl: "Tagihan & Utilitas",

  // Kesehatan & Obat
  obat: "Kesehatan & Obat",
  apotek: "Kesehatan & Obat",
  vitamin: "Kesehatan & Obat",
  dokter: "Kesehatan & Obat",
  klinik: "Kesehatan & Obat",
  rs: "Kesehatan & Obat",
  paracetamol: "Kesehatan & Obat",

  // Pendidikan & Anak
  spp: "Pendidikan & Anak",
  sekolah: "Pendidikan & Anak",
  les: "Pendidikan & Anak",
  buku: "Pendidikan & Anak",
  kursus: "Pendidikan & Anak",
  mainan: "Pendidikan & Anak",

  // Hiburan & Rekreasi
  nonton: "Hiburan & Rekreasi",
  bioskop: "Hiburan & Rekreasi",
  cinema: "Hiburan & Rekreasi",
  netflix: "Hiburan & Rekreasi",
  spotify: "Hiburan & Rekreasi",
  liburan: "Hiburan & Rekreasi",
  hotel: "Hiburan & Rekreasi",

  // Gaji & Pendapatan
  gaji: "Gaji & Pendapatan",
  honor: "Gaji & Pendapatan",
  bonus: "Gaji & Pendapatan",
  dividen: "Gaji & Pendapatan",
  omset: "Gaji & Pendapatan",
  proyek: "Gaji & Pendapatan",
};

const INCOME_INDICATORS = [
  "gaji",
  "masuk",
  "terima",
  "dapat",
  "honor",
  "fee",
  "bonus",
  "dividen",
  "tf masuk",
  "transfer masuk",
  "kembalian",
  "pendapatan",
  "penjualan",
];

/**
 * Extracts numeric value from Indonesian currency shorthand
 */
function parseIndonesianAmount(raw: string): { amount: number; matchedString: string } | null {
  const clean = raw.toLowerCase().replace(/rp\.?/g, "").trim();

  // Pattern 1: Millions shorthand: "1.5jt", "1,5 jt", "2jt", "2 juta"
  const jtMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)\b/);
  if (jtMatch) {
    const num = parseFloat(jtMatch[1].replace(",", "."));
    if (!isNaN(num) && num > 0) {
      return { amount: Math.round(num * 1000000), matchedString: jtMatch[0] };
    }
  }

  // Pattern 2: Thousands shorthand: "150rb", "150 rb", "150k", "150 k", "150ribu"
  const rbMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|k|ribu)\b/);
  if (rbMatch) {
    const num = parseFloat(rbMatch[1].replace(",", "."));
    if (!isNaN(num) && num > 0) {
      return { amount: Math.round(num * 1000), matchedString: rbMatch[0] };
    }
  }

  // Pattern 3: Explicit dot-separated currency: "150.000", "1.500.000", "35000"
  const standardMatch = clean.match(/\b(\d{1,3}(?:\.\d{3})+|\d{4,9})\b/);
  if (standardMatch) {
    const numStr = standardMatch[1].replace(/\./g, "");
    const num = parseInt(numStr, 10);
    if (!isNaN(num) && num > 0) {
      return { amount: num, matchedString: standardMatch[0] };
    }
  }

  return null;
}

/**
 * Fast-path parser for Indonesian daily financial texts
 * Returns parsed transaction object if confidence >= 0.85, or null if ambiguous
 */
export function fastParseIndonesianFinancialText(text: string): FastParsedTransaction | null {
  if (!text || text.trim().length < 3) return null;

  const lower = text.toLowerCase().trim();

  // Do not fast-parse if text is a question or conversation
  if (
    lower.includes("?") ||
    lower.startsWith("tanya") ||
    lower.startsWith("apakah") ||
    lower.startsWith("bagaimana") ||
    lower.startsWith("kenapa") ||
    lower.startsWith("berapa") ||
    lower.startsWith("rekomendasi") ||
    lower.startsWith("saran")
  ) {
    return null;
  }

  // 1. Extract Amount
  const amountResult = parseIndonesianAmount(lower);
  if (!amountResult || amountResult.amount <= 0) {
    return null; // No clear amount found -> defer to Gemini
  }

  const { amount, matchedString } = amountResult;

  // 2. Identify Transaction Type
  const isIncome = INCOME_INDICATORS.some((w) => lower.includes(w));
  const type: "expense" | "income" = isIncome ? "income" : "expense";

  // 3. Identify Wallet Hint
  let walletHint: string | null = null;
  let matchedWalletKeyword = "";

  for (const [kw, walletName] of Object.entries(WALLET_KEYWORDS)) {
    const regex = new RegExp(`\\b(?:pake|via|dari|ke|pakai|by)?\\s*${kw}\\b`, "i");
    if (regex.test(lower)) {
      walletHint = walletName;
      matchedWalletKeyword = kw;
      break;
    }
  }

  // 4. Identify Category Hint
  let category = type === "income" ? "Gaji & Pendapatan" : "Lain-lain";
  for (const [kw, catName] of Object.entries(CATEGORY_MAP)) {
    const catRegex = new RegExp(`\\b${kw}\\b`, "i");
    if (catRegex.test(lower)) {
      category = catName;
      break;
    }
  }

  // 5. Clean up description
  let desc = lower;
  // Remove matched amount string
  desc = desc.replace(matchedString, "");
  // Remove "rp", "rp."
  desc = desc.replace(/\brp\.?\b/gi, "");
  // Remove wallet keyword
  if (matchedWalletKeyword) {
    desc = desc.replace(new RegExp(`\\b(?:pake|via|dari|ke|pakai|by)?\\s*${matchedWalletKeyword}\\b`, "gi"), "");
  }
  // Remove common filler verbs at the beginning
  desc = desc.replace(/^(?:catat|catatlah|tolong catat|masukin|beli|bayar|jajan|isi|pengeluaran|pemasukan)\s+/i, "");
  desc = desc.replace(/[.,:;!]/g, " ").trim();

  // Normalize description capitalization
  if (!desc || desc.length < 2) {
    desc = category !== "Lain-lain" ? category : (type === "income" ? "Pendapatan" : "Pengeluaran");
  } else {
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  }

  // Calculate confidence score
  let confidence = 0.88;
  if (walletHint) confidence += 0.05;
  if (category !== "Lain-lain") confidence += 0.05;

  return {
    confidence: Math.min(confidence, 0.98),
    type,
    amount,
    category,
    wallet_hint: walletHint,
    description: desc,
  };
}
