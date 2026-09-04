import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { normalizeReceiptItemName } from "./receipt-dictionary.ts";

export interface ParsedReceiptItem {
  name: string;
  qty: number;
  price: number;
  raw_name?: string;
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
2. CRITICAL RULES FOR RECEIPT / STRUK PHOTOS:
   - Distinguish TOTAL vs CASH vs KEMBALI:
     * "TOTAL", "GRAND TOTAL", "SUBTOTAL", or "TAGIHAN" is the actual purchase amount (the true expense).
     * "CASH", "TUNAI", "BAYAR", "DIBAYAR", "TENDERED" is the physical cash bill handed to cashier (e.g. Rp 50.000). NEVER use CASH/TUNAI as the expense amount if a TOTAL or KEMBALI is present!
     * "KEMBALI", "KEMBALIAN", "CHANGE" is the change returned (e.g. Rp 3.400).
     * Verification Formula: Actual Expense = TOTAL = CASH - KEMBALI (e.g. 50.000 - 3.400 = 46.600).
    - If paper crease, fold, or tear obscures the TOTAL line, calculate the sum of itemized purchases or subtract KEMBALI from CASH.
    - Extract merchant name, transaction date (YYYY-MM-DD), and itemized lines with qty and unit price.
    - TRANSLATE & DE-ABBREVIATE INDONESIAN SUPERMARKET RECEIPT CODES:
      * POS cash registers in Indonesia (Indomaret, Alfamart, Superindo, Hypermart, SAGALA, etc.) use cryptic abbreviations.
      * You MUST expand these into complete, natural, and clear Indonesian product names for "name" using the format:
        [Kategori Produk] [Brand] [Varian/Rasa] [Ukuran/Berat/Isi]
      * Crucial Retail Category Decryption Rules:
        - Deconstruct Concatenated / No-Space POS Cashier Codes:
          * POS cash registers in Indonesia (Indomaret, Alfamart, Superindo, Hypermart, etc.) frequently join words together without spaces to fit 16-20 character column limits (e.g. "INDOMIEGRSPCJUMBO129").
          * You MUST deconstruct these into individual brand, variant, flavor, and unit tokens:
            - "INDOMIEGRSPCJUMBO129" / "Indomiegrspcjumbo129" -> name: "Indomie Goreng Spesial Jumbo 129g", raw_name: "INDOMIEGRSPCJUMBO129"
            - "INDOMIEGRG85" -> name: "Indomie Goreng 85g", raw_name: "INDOMIEGRG85"
            - "INDOMIEAYMBWG" -> name: "Indomie Kuah Rasa Ayam Bawang", raw_name: "INDOMIEAYMBWG"
            - "INDOMIESOTO" -> name: "Indomie Kuah Rasa Soto Mie", raw_name: "INDOMIESOTO"
            - "MIESDPGRG90" -> name: "Mie Sedaap Goreng 90g", raw_name: "MIESDPGRG90"
            - "ULTRAMILKCKLT250" -> name: "Susu UHT Ultra Milk Rasa Cokelat 250ml", raw_name: "ULTRAMILKCKLT250"
            - "BEARBRAND189" -> name: "Susu Steril Bear Brand 189ml", raw_name: "BEARBRAND189"
            - "BIMOLIGR2L" -> name: "Minyak Goreng Bimoli 2L", raw_name: "BIMOLIGR2L"
            - "SUNLIGHTJERUK755" -> name: "Sunlight Pencuci Piring Jeruk Nipis 755ml", raw_name: "SUNLIGHTJERUK755"
        - Bakery & Roti:
          * "SR." / "SR.TOGO" / "SR TOGO" -> "Sari Roti Sandwich To Go"
          * "RTI TWR" -> "Roti Tawar", "RTI KPS" -> "Roti Kupas"
        - Biskuit, Wafer & Snacks:
          * "BISKUAT GLDN VNL" -> "Biskuit Biskuat Energi Golden Vanilla"
          * "GLDN" -> "Golden", "VNL" -> "Vanilla", "CKLT" / "CKL" / "BLACK" -> "Cokelat Black", "KJU" -> "Keju"
          * "TGR" / "TG" -> "Wafer Tango", "OREO VNL" -> "Biskuit Oreo Krim Rasa Vanilla"
        - Susu & Minuman:
          * "INDOMILK SKMP POUCH S" -> "Indomilk Susu Kental Manis Putih (SKMP) Kemasan Pouch (S)"
          * "SKMP" -> "Susu Kental Manis Putih (SKMP)", "SKMC" -> "Susu Kental Manis Cokelat (SKMC)"
          * "ULTRA PLAIN 250ML" -> "Susu UHT Ultra Milk Plain 250ml"
          * "BEAR BRAND" -> "Susu Steril Bear Brand"
          * "AQ" / "AQUA" / "MNRL" -> "Aqua Air Mineral", "PCR SWT" -> "Pocari Sweat"
        - Bahan Pokok & Minyak:
          * "MYK GRNG" / "MYK GOR" / "MYK GR" -> "Minyak Goreng"
          * "BML SPCL" / "BIMOLI SPCL" -> "Minyak Goreng Bimoli Spesial"
          * "TLR AYM NGR" -> "Telur Ayam Negeri", "DGG SAPI" -> "Daging Sapi Segar"
        - Kebersihan & Rumah Tangga:
          * "RNS DET" -> "Rinso Deterjen", "SBN CUC PRG" -> "Sabun Cuci Piring"
          * "PCH" / "POUCH" -> "Kemasan Pouch", "RFL" / "REFILL" -> "Isi Ulang (Refill)", "BTL" -> "Botol", "KLG" -> "Kaleng"
      * Exact Target Examples:
        - "SR.TOGO BLACK 128GR" / "Sr.togo Black" -> name: "Sari Roti Sandwich To Go Rasa Black Cokelat 128g", raw_name: "SR.TOGO BLACK 128GR"
        - "BISKUAT GLDN VNL 105" / "Biskuat Gldn Vnl" -> name: "Biskuit Biskuat Energi Golden Vanilla 105g", raw_name: "BISKUAT GLDN VNL 105"
        - "INDOMILK SKMP POUCH S" -> name: "Indomilk Susu Kental Manis Putih (SKMP) Kemasan Pouch (S)", raw_name: "INDOMILK SKMP POUCH S"
        - "ULTRA PLAIN 250ML" -> name: "Susu UHT Ultra Milk Plain 250ml", raw_name: "ULTRA PLAIN 250ML"
        - "INDOMIEGRSPCJUMBO129" / "Indomiegrspcjumbo129" -> name: "Indomie Goreng Spesial Jumbo 129g", raw_name: "INDOMIEGRSPCJUMBO129"
      * Store the exact printed text from receipt in "raw_name", and the expanded friendly complete name in "name".
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
          name: { type: Type.STRING, description: "Clear translated Indonesian product name" },
          qty: { type: Type.INTEGER },
          price: { type: Type.INTEGER },
          raw_name: { type: Type.STRING, description: "Exact original text code printed on the receipt" },
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
      contents.push({
        text:
          "Ekstrak transaksi dari foto nota/struk belanja di atas.\n" +
          "PERINGATAN KHUSUS STRUK:\n" +
          "- Ambil nominal TOTAL / TAGIHAN belanja yang sebenarnya (bukan uang CASH/TUNAI yang diserahkan ke kasir).\n" +
          "- Jika terdapat baris CASH dan KEMBALI, total belanja sebenarnya adalah TOTAL = CASH - KEMBALI.\n" +
          "- Pastikan nominal transaksi konsisten dengan penjumlahan harga rincian item.",
      });
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
      model: "gemini-3.5-flash-lite",
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
    if (options.imageBuffer) {
      return verifyAndReconcileReceipt(parsed);
    }
    return parsed;
  } catch (err) {
    console.error("❌ Error running Gemini parser:", err);
    return null;
  }
}

/**
 * Deterministic Layer-2 mathematical reconciliation for receipts
 * Verifies sum of items and protects against cash-tendered rounding confusion.
 */
export function verifyAndReconcileReceipt(
  parsed: GeminiParsedTransaction
): GeminiParsedTransaction {
  if (!parsed || !parsed.items || parsed.items.length === 0) {
    return parsed;
  }

  // Normalize each item name using the deterministic Indonesian retail dictionary
  parsed.items = parsed.items.map((item) => {
    const rawCode = item.raw_name || item.name;
    const normalized = normalizeReceiptItemName(rawCode);
    return {
      ...item,
      name: normalized.name,
      raw_name: item.raw_name || (normalized.name !== rawCode ? rawCode : undefined),
    };
  });

  // Calculate sum of itemized purchases
  const sumItems = parsed.items.reduce((acc, item) => {
    const qty = item.qty > 0 ? item.qty : 1;
    const price = item.price > 0 ? item.price : 0;
    return acc + qty * price;
  }, 0);

  if (sumItems > 0 && parsed.amount !== sumItems) {
    const isRoundCashBill =
      parsed.amount % 10000 === 0 ||
      parsed.amount % 20000 === 0 ||
      parsed.amount % 50000 === 0;

    // Case 1: AI picked cash bill (e.g. 50,000) instead of exact item total (e.g. 46,600)
    if (parsed.amount > sumItems && isRoundCashBill) {
      console.log(
        `[ReceiptReconciler] Corrected cash bill amount Rp ${parsed.amount} to verified item sum Rp ${sumItems}`
      );
      parsed.amount = sumItems;
    } else if (Math.abs(parsed.amount - sumItems) / sumItems <= 0.15 && isRoundCashBill) {
      console.log(
        `[ReceiptReconciler] Reconciled round amount Rp ${parsed.amount} to items sum Rp ${sumItems}`
      );
      parsed.amount = sumItems;
    }
  }

  return parsed;
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
6. PENTING: Anda adalah Asisten Keuangan Keluarga F&R. Jika pertanyaan pengguna berada di luar topik keuangan atau dokumen keluarga (seperti meminta cerita umum, coding, puisi, politik, dll.), tolak secara singkat & ramah dalam 1-2 kalimat, lalu arahkan kembali ke pencatatan transaksi atau cek saldo keluarga.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
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

/**
 * Translates raw Indonesian POS receipt item codes into complete, natural product names using Gemini 3.5 Flash Lite.
 * Uses local dictionary fallback for zero-latency or when offline / API key missing.
 */
export async function translateReceiptItemsWithGemini(
  rawItemCodes: string[]
): Promise<Array<{ raw_name: string; name: string }>> {
  if (!rawItemCodes || rawItemCodes.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback to local dictionary
    return rawItemCodes.map((code) => {
      const normalized = normalizeReceiptItemName(code);
      return {
        raw_name: code,
        name: normalized.name,
      };
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
Terjemahkan dan lengkapi daftar singkatan kode item struk kasir supermarket/minimarket Indonesia (seperti Indomaret, Alfamart, Superindo, Hypermart) berikut menjadi nama produk bahasa Indonesia yang lengkap, jelas, dan natural:
Format: [Kategori Produk] [Brand] [Varian Rasa] [Ukuran/Berat/Isi]

Contoh:
- "SR.TOGO BLACK 128GR" / "Sr.togo Black" -> "Sari Roti Sandwich To Go Rasa Black Cokelat 128g"
- "BISKUAT GLDN VNL 105" / "Biskuat Gldn Vnl" -> "Biskuit Biskuat Energi Golden Vanilla 105g"
- "INDOMILK SKMP POUCH S" -> "Indomilk Susu Kental Manis Putih (SKMP) Kemasan Pouch (S)"
- "ULTRA PLAIN 250ML" -> "Susu UHT Ultra Milk Plain 250ml"
- "MYK GRNG 2L" -> "Minyak Goreng 2L"

Daftar kode item untuk diterjemahkan:
${JSON.stringify(rawItemCodes, null, 2)}
`;

    const translationSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          raw_name: { type: Type.STRING, description: "Kode singkatan asli dari struk" },
          name: { type: Type.STRING, description: "Nama produk lengkap, jelas, dan natural" },
        },
        required: ["raw_name", "name"],
      },
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: translationSchema,
        temperature: 0.1,
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("❌ Error running translateReceiptItemsWithGemini:", err);
  }

  // Fallback if Gemini request fails or returns unexpected format
  return rawItemCodes.map((code) => {
    const normalized = normalizeReceiptItemName(code);
    return {
      raw_name: code,
      name: normalized.name,
    };
  });
}

