export interface RelevanceCheckResult {
  isRelevant: boolean;
  isGreeting: boolean;
  category?: "transaction" | "query" | "document" | "system" | "greeting" | "irrelevant";
  rejectionMessage?: string;
}

// In-memory rate limiting map: userId -> array of timestamps
const rateLimitMap = new Map<string, number[]>();
const MAX_REQUESTS_PER_MINUTE = 20;

/**
 * Checks if a user has exceeded the rate limit (20 requests per minute)
 */
export function checkRateLimit(userId: string | number): { allowed: boolean; remainingSeconds?: number } {
  const key = String(userId);
  const now = Date.now();
  const windowMs = 60 * 1000;

  const timestamps = rateLimitMap.get(key) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldest = validTimestamps[0];
    const remainingMs = windowMs - (now - oldest);
    return {
      allowed: false,
      remainingSeconds: Math.ceil(remainingMs / 1000),
    };
  }

  validTimestamps.push(now);
  rateLimitMap.set(key, validTimestamps);
  return { allowed: true };
}

// 1. Indonesian Amount Regex Patterns
const AMOUNT_PATTERNS = [
  /\b\d+[\.,]?\d*\s*(rb|ribu|k|jt|juta|perak)\b/i,
  /\brp\s*\.?\s*\d+/i,
  /\b\d+\s*(rb|k|jt)\b/i,
  /\b(cepek|gocap|seceng|noceng|gopay|ceban|goban)\b/i,
  /\b\d{4,}\b/, // numbers with 4+ digits like 50000, 15000
];

// 2. Financial Transaction Keywords
const TRANSACTION_KEYWORDS = [
  "beli", "bayar", "transfer", "kirim", "jajan", "belanja", "ongkir",
  "gaji", "bonus", "pemasukan", "pengeluaran", "tarik", "topup", "top up",
  "isi bensin", "isi saldo", "makan", "minum", "ngopi", "pesan gofood",
  "langganan", "tagihan", "cicilan", "uang masuk", "uang keluar"
];

// 3. Financial Query Keywords
const FINANCIAL_QUERY_KEYWORDS = [
  "saldo", "uang", "duit", "rekening", "dompet", "kas", "anggaran", "budget",
  "sisa", "total", "mutasi", "transaksi", "habis berapa", "pengeluaran bulan",
  "pemasukan bulan", "bca", "mandiri", "bri", "bni", "gopay", "ovo", "dana",
  "shopeepay", "cash", "tunai", "keuangan", "finansial", "laporan", "neraca"
];

// 4. Document / Vault Keywords
const DOCUMENT_KEYWORDS = [
  "dokumen", "berkas", "arsip", "brankas", "stnk", "sim", "ktp", "paspor",
  "bpjs", "asuransi", "shm", "sertifikat", "pbb", "pajak", "npwp", "ijazah",
  "kartu keluarga", "kk", "akta", "jatuh tempo", "kedaluwarsa", "expired",
  "habis kapan", "masa berlaku", "perpanjang"
];

// 5. Friendly Greetings
const GREETING_PATTERNS = [
  /^(halo|hai|hi|hey|helo)\b/i,
  /^(selamat\s+(pagi|siang|sore|malam))\b/i,
  /^(assalamu'?alaikum|assalamualaikum|kulonuwun)\b/i,
  /^(terima\s*kasih|makasih|thanks|thank you)\b/i,
  /^(tes|test|ping|p)\b/i,
];

// 6. Obvious Out-of-Domain Keywords
const IRRELEVANT_KEYWORDS = [
  "puisi", "pantun", "cerpen", "dongeng", "resep masakan", "cara memasak",
  "coding", "bikin koding", "html", "javascript", "python script", "tugas sekolah",
  "pr matematika", "siapa presiden", "politik", "pemilu", "pilpres",
  "ramalan zodiak", "horoskop", "terjemahkan bahasa inggris", "translate",
  "lirik lagu", "chord gitar", "ceritakan lelucon", "lawakan", "stand up comedy"
];

/**
 * Fast, deterministic Zero-Cost Relevance Checker.
 * Decides whether to allow message through to Gemini AI or politely deflect at gate.
 */
export function checkMessageRelevance(text: string, senderName = "Keluarga"): RelevanceCheckResult {
  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase();

  // A. Check for polite greetings
  const isGreeting = GREETING_PATTERNS.some((pattern) => pattern.test(lowerText));
  if (isGreeting && cleanText.split(/\s+/).length <= 4) {
    return {
      isRelevant: true,
      isGreeting: true,
      category: "greeting",
    };
  }

  // B. Check for Amount / Transaction indicators (High Confidence)
  const hasAmount = AMOUNT_PATTERNS.some((pattern) => pattern.test(lowerText));
  const hasTxKeyword = TRANSACTION_KEYWORDS.some((kw) => lowerText.includes(kw));

  if (hasAmount || (hasTxKeyword && hasAmount)) {
    return {
      isRelevant: true,
      isGreeting: false,
      category: "transaction",
    };
  }

  // C. Check for Financial Queries
  const hasFinQuery = FINANCIAL_QUERY_KEYWORDS.some((kw) => lowerText.includes(kw));
  if (hasFinQuery) {
    return {
      isRelevant: true,
      isGreeting: false,
      category: "query",
    };
  }

  // D. Check for Document / Vault Queries
  const hasDocKeyword = DOCUMENT_KEYWORDS.some((kw) => lowerText.includes(kw));
  if (hasDocKeyword) {
    return {
      isRelevant: true,
      isGreeting: false,
      category: "document",
    };
  }

  // E. Check for obvious Out-of-Domain keywords
  const hasIrrelevantKeyword = IRRELEVANT_KEYWORDS.some((kw) => lowerText.includes(kw));
  if (hasIrrelevantKeyword) {
    return {
      isRelevant: false,
      isGreeting: false,
      category: "irrelevant",
      rejectionMessage: getPoliteRejectionMessage(senderName),
    };
  }

  // F. Fallback heuristic: If message is long (>6 words) and lacks any financial/document context
  const words = cleanText.split(/\s+/);
  if (words.length > 5 && !hasTxKeyword && !hasFinQuery && !hasDocKeyword && !hasAmount) {
    return {
      isRelevant: false,
      isGreeting: false,
      category: "irrelevant",
      rejectionMessage: getPoliteRejectionMessage(senderName),
    };
  }

  // Allow short/ambiguous queries to be clarified by system
  return {
    isRelevant: true,
    isGreeting: false,
    category: "query",
  };
}

/**
 * Generates an empathetic, educational, and helpful rejection message.
 */
export function getPoliteRejectionMessage(senderName: string): string {
  return (
    `👋 Halo *${senderName}*!\n\n` +
    `Saya adalah *Asisten Keuangan & Dokumen Keluarga F&R Hub* 🏡.\n\n` +
    `Saya dirancang khusus untuk membantu pencatatan transaksi finansial dan arsip legalitas keluarga Anda, bukan untuk percakapan umum.\n\n` +
    `💡 *Hal yang bisa Anda lakukan bersama saya:*\n` +
    `• 💵 *Catat Transaksi:* Kirim foto struk kasir atau ketik: _"Beli bensin 50rb BCA"_\n` +
    `• 💳 *Cek Saldo:* _"Berapa sisa saldo BCA saat ini?"_\n` +
    `• 🎯 *Pantau Anggaran:* _"Apakah anggaran makan masih aman?"_\n` +
    `• 📁 *Cek Dokumen:* _"Kapan STNK mobil habis?"_\n\n` +
    `_Silakan pilih tombol menu di bawah ini untuk aksi cepat!_ 👇`
  );
}
