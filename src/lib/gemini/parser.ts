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
      model: "gemini-2.5-flash",
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
