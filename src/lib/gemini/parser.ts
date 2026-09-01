import { GoogleGenAI, Type, Schema } from "@google/genai";

export interface ParsedReceiptItem {
  name: string;
  qty: number;
  price: number;
}

export interface GeminiParsedTransaction {
  confidence: number;
  type: "expense" | "income" | "transfer";
  amount: number;
  category: string;
  wallet_hint?: string | null;
  to_wallet_hint?: string | null;
  description: string;
  items: ParsedReceiptItem[];
  merchant_name?: string | null;
  transaction_date?: string | null;
  transcription?: string | null;
}

const SYSTEM_INSTRUCTION = `
You are a specialized Indonesian Family Financial Assistant for "F&R Family Hub".
Your mission is to accurately parse unstructured inputs (Indonesian text messages, receipt/bill photos, or spoken Indonesian voice audio) and extract clean, structured transaction data.

Categories to choose from:
- "Makanan & Minuman" (Resto, cafe, jajan, kopi)
- "Belanja Bulanan / Groceries" (Supermarket, Indomaret, Alfamart, pasar)
- "Transportasi & Bensin" (BBM, parkir, tol, ojol, servis kendaraan)
- "Tagihan & Utilitas" (Listrik PLN, PDAM, Indihome/Wifi, IPL, pulsa)
- "Kesehatan & Obat" (Apotek, dokter, klinik, vitamin)
- "Pendidikan & Anak" (SPP, les, buku, mainan, perlengkapan sekolah)
- "Hiburan & Rekreasi" (Nonton bioskop, liburan, streaming Netflix)
- "Gaji & Pendapatan" (Gaji bulanan, bonus, dividen, penjualan)
- "Investasi & Tabungan" (Beli emas, reksadana, transfer ke tabungan)
- "Lain-lain" (Kebutuhan tak terduga)

Rules:
1. Always parse Indonesian slang numbers: "50rb" -> 50000, "1.5jt" -> 1500000, "15k" -> 15000, "cepek" -> 100000.
2. For receipt photos, extract merchant name, total receipt amount, transaction date, and itemized lines.
3. For voice notes, transcribe the spoken Indonesian words accurately into the transcription field.
4. Extract wallet hints if mentioned (e.g. "bca", "mandiri", "gopay", "ovo", "cash", "tunai", "kantong").
`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    confidence: { type: Type.NUMBER, description: "Confidence score between 0.0 and 1.0" },
    type: { type: Type.STRING, enum: ["expense", "income", "transfer"] },
    amount: { type: Type.INTEGER, description: "Total transaction amount in clean integer IDR" },
    category: { type: Type.STRING, description: "Standard Indonesian category" },
    wallet_hint: { type: Type.STRING, nullable: true, description: "Mentioned wallet name like BCA, Gopay, Tunai" },
    to_wallet_hint: { type: Type.STRING, nullable: true, description: "Destination wallet for transfer" },
    description: { type: Type.STRING, description: "Brief clear Indonesian description" },
    merchant_name: { type: Type.STRING, nullable: true, description: "Store / Merchant / Vendor name" },
    transaction_date: { type: Type.STRING, nullable: true, description: "Date in YYYY-MM-DD if found on receipt, else null" },
    transcription: { type: Type.STRING, nullable: true, description: "Transcription if input was voice audio" },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          qty: { type: Type.INTEGER },
          price: { type: Type.INTEGER },
        },
        required: ["name", "qty", "price"],
      },
    },
  },
  required: ["confidence", "type", "amount", "category", "description", "items"],
};

/**
 * Parses text, image, or audio buffer using Gemini 2.5 Flash
 */
export async function parseFinancialInputWithGemini(options: {
  text?: string;
  imageBuffer?: Buffer;
  imageMimeType?: string;
  audioBuffer?: Buffer;
  audioMimeType?: string;
}): Promise<GeminiParsedTransaction | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY is not set in environment.");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const contents: any[] = [];

    if (options.text) {
      contents.push({ text: `Analisis teks transaksi berikut:\n"${options.text}"` });
    }

    if (options.imageBuffer) {
      contents.push({
        inlineData: {
          mimeType: options.imageMimeType || "image/jpeg",
          data: options.imageBuffer.toString("base64"),
        },
      });
      contents.push({ text: "Ekstrak transaksi dari foto nota/struk belanja di atas." });
    }

    if (options.audioBuffer) {
      contents.push({
        inlineData: {
          mimeType: options.audioMimeType || "audio/ogg",
          data: options.audioBuffer.toString("base64"),
        },
      });
      contents.push({ text: "Dengarkan pesan suara bahasa Indonesia ini, transkripsikan, lalu ekstrak transaksi ke format JSON." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      return null;
    }

    const parsed: GeminiParsedTransaction = JSON.parse(responseText);
    return parsed;
  } catch (err) {
    console.error("❌ Error running Gemini parser:", err);
    return null;
  }
}

/**
 * Answers natural language questions about family finances using Gemini 3.7 Flash
 */
export async function answerFinancialQuestionWithGemini(
  question: string,
  financialContext: {
    wallets: any[];
    budgets: any[];
    recentTransactions: any[];
    monthlyTotalExpense: number;
    monthlyTotalIncome: number;
  }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "Maaf, API Key Gemini belum diatur.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const totalCash = financialContext.wallets.reduce(
      (acc, w) => acc + Number(w.current_balance || 0),
      0
    );

    const prompt = `
Anda adalah Asisten Finansial Pintar Keluarga F&R (bernama "F&R Assistant").
Tugas Anda adalah menjawab pertanyaan pengguna tentang kondisi keuangan, saldo, pengeluaran, atau anggaran keluarga dengan ramah, jelas, ringkas, dan akurat berdasarkan data real-time berikut:

DATA KEUANGAN REAL-TIME:
- Total Saldo Kas Tersedia: Rp ${totalCash.toLocaleString("id-ID")}
- Pemasukan Bulan Ini: Rp ${financialContext.monthlyTotalIncome.toLocaleString("id-ID")}
- Pengeluaran Bulan Ini: Rp ${financialContext.monthlyTotalExpense.toLocaleString("id-ID")}

REKENING & DOMPET AKTIF:
${financialContext.wallets.length > 0 ? financialContext.wallets.map((w) => `• ${w.name} (${w.type}): Rp ${Number(w.current_balance || 0).toLocaleString("id-ID")}`).join("\n") : "Belum ada rekening"}

ANGGARAN & REALISASI BELANJA BULAN INI:
${financialContext.budgets.length > 0 ? financialContext.budgets.map((b) => `• ${b.name}: Terpakai Rp ${Number(b.spent || 0).toLocaleString("id-ID")} dari Target Rp ${Number(b.target || 0).toLocaleString("id-ID")} (${b.target > 0 ? Math.round((b.spent / b.target) * 100) : 0}%)`).join("\n") : "Belum ada anggaran"}

TRANSAKSI TERAKHIR:
${financialContext.recentTransactions.length > 0 ? financialContext.recentTransactions.map((t) => `• [${t.transaction_date?.substring(0, 10)}] ${t.description} (${t.category?.name || "Lain-lain"}): ${t.type === "expense" ? "-" : "+"}Rp ${Number(t.amount || 0).toLocaleString("id-ID")} [${t.wallet?.name || "Dompet"}]`).join("\n") : "Belum ada transaksi"}

PERTANYAAN PENGGUNA:
"${question}"

Instruksi Menjawab:
1. Jawab langsung pertanyaan pengguna secara ramah menggunakan format teks Telegram (gunakan bullet point atau tebal *bold* jika perlu).
2. Jika pengguna menanyakan sisa saldo, sebutkan per dompet atau totalnya.
3. Jika menanyakan pengeluaran atau anggaran, sebutkan kategori terkait beserta status persentasenya.
4. Selalu gunakan format angka Rupiah Indonesia (Rp XX.XXX).
5. Jangan membuat data fiktif di luar data keuangan di atas.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
      },
    });

    return response.text || "Maaf, saya tidak dapat memproses jawaban saat ini.";
  } catch (err: any) {
    console.error("❌ Error running Gemini Q&A:", err);
    return "Maaf, terjadi kendala saat menghubungi AI Gemini: " + err.message;
  }
}

