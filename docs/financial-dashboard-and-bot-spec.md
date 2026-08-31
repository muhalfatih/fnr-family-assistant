# 📊 Spesifikasi UI Dashboard Finansial & Bot Gemini Parser

Dokumen spesifikasi untuk antarmuka web dashboard keuangan dan alur pemrosesan LLM Gemini.

---

## 1. Desain Web UI: Financial & Budgeting Dashboard

Dashboard web dibangun menggunakan **Next.js (App Router), Tailwind CSS, Lucide Icons, & Recharts / Tremor UI**.

```
+-----------------------------------------------------------------------------------------+
| 🏡 F&R Family Hub        [ Bulan: Agustus 2026 ▾ ]  [ Filter: Semua Dompet ▾ ] [👤 Profil] |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|  [ 💵 Total Saldo Kas ]     [ 📈 Pemasukan Bln Ini ]   [ 📉 Pengeluaran Bln Ini ]  [ 🎯 Sisa Budget ]|
|    Rp 42.850.000               Rp 25.000.000              Rp 14.320.000             Rp 5.680.000    |
|    (+2.4% vs bln lalu)         (Gaji + Usaha)             (58% dari Budget)         (Aman / Hijau)  |
|                                                                                         |
+---------------------------------------------+-------------------------------------------+
| 📊 Grafik Arus Kas Harian (Income vs Expense) | 🥧 Proporsi Pengeluaran per Kategori      |
| [ Area / Bar Chart: Trend 31 Hari ]         | - 🍔 Makanan & Minuman: 35% (Rp 5.012.000)|
|                                             | - ⚡ Tagihan & Utilitas: 22% (Rp 3.150.000)|
|                                             | - 🚗 Bensin & Transport: 15% (Rp 2.148.000)|
|                                             | - 👶 Anak & Pendidikan: 18% (Rp 2.577.000)|
|                                             | - 🛍️ Lain-lain: 10% (Rp 1.433.000)        |
+---------------------------------------------+-------------------------------------------+
| 🎯 Progress Budgeting Bulanan               | 🕒 Transaksi Terbaru (Live dari Bot/Web) |
|                                             |                                           |
| 🍔 Makanan (Rp 5.0M / Rp 6.0M)   [ 83% 🟧 ] | 2 Menit lalu • [BCA] via Telegram Bot     |
| ⚡ Utilitas (Rp 3.1M / Rp 3.5M)  [ 88% 🟧 ] | 🥐 Beli Roti & Susu Indomaret - Rp 45.000 |
| 🚗 Transport (Rp 2.1M / Rp 3.0M) [ 70% 🟩 ] |                                           |
| 💊 Kesehatan (Rp 200k / Rp 1.5M) [ 13% 🟩 ] | Tadi Pagi • [Gopay] Voice Note Bot       |
|                                             | ⛽ Bensin Mobil Shell - Rp 150.000        |
+---------------------------------------------+-------------------------------------------+
```

---

## 2. Gemini System Prompt & Output Schema (Structured Output)

Setiap pesan dari Telegram (teks, gambar struk, atau audio voice note) akan dikirim ke Gemini Flash dengan instruksi terstruktur berikut:

```typescript
export const GEMINI_TRANSACTION_SYSTEM_INSTRUCTION = `
You are a specialized Indonesian Family Financial Assistant for "F&R Family Hub".
Your job is to parse unstructured input (Indonesian text, receipt images, or spoken Indonesian voice audio) and return a strictly valid JSON object representing financial transactions.

Available Transaction Types:
- "expense": spending money
- "income": receiving money, salary, cashback
- "transfer": moving money between wallets

Common Categories:
- "Makanan & Minuman"
- "Belanja Bulanan / Groceries"
- "Transportasi & Bensin"
- "Tagihan & Utilitas"
- "Kesehatan & Obat"
- "Pendidikan & Anak"
- "Hiburan & Rekreasi"
- "Gaji & Pendapatan"
- "Lain-lain"

JSON Response Format (No markdown wrappers, pure JSON):
{
  "confidence": number, // 0.0 to 1.0
  "type": "expense" | "income" | "transfer",
  "amount": number, // Clean integer, e.g. 50000 (if "50rb" -> 50000, "1.5jt" -> 1500000)
  "category": string,
  "wallet_hint": string | null, // e.g. "bca", "gopay", "cash", "ovo", "mandiri"
  "to_wallet_hint": string | null, // only for transfer
  "description": string, // Short clean description
  "items": [ // extracted receipt items if image/detailed text
    {
      "name": string,
      "qty": number,
      "price": number
    }
  ],
  "merchant_name": string | null,
  "transaction_date": string | null // ISO format "YYYY-MM-DD" if present on receipt, else null (use current date)
}
`;
```
