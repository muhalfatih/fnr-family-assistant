# ADR 002: Arsitektur Omnichannel Bot (Telegram First) & Google Gemini Multimodal Parser

## Status
**Accepted** (Disetujui) — 2026-08-31

## Konteks
Anggota keluarga membutuhkan cara paling cepat dan tanpa friksi (*zero-friction*) untuk mencatat pengeluaran, tagihan, dan pemasukan harian:
- Seringkali tidak sempat membuka aplikasi web untuk memasukkan transaksi satu per satu.
- Format input beragam: teks singkat (*"makan siang 35k qris"*), foto struk belanja Indomaret/resto, atau pesan suara (*voice note* saat sedang menyetir/sibuk).
- Dibutuhkan parser AI yang mampu mengekstrak entitas ke format data terstruktur (JSON) dengan akurasi tinggi dan biaya $0.

## Keputusan
1. **Saluran Bot Pertama: Telegram Bot API**
   - **Alasan**: 100% gratis resmi tanpa batas pesan, setup instan via `@BotFather`, webhook support via HTTPS, tidak ada risiko *banned* nomor seperti WhatsApp tidak resmi, dan mendukung transmisi file audio/foto beresolusi tinggi.
   - WhatsApp Bot akan diintegrasikan pada fase selanjutnya melalui WhatsApp Cloud API / Baileys.
2. **AI Multimodal Engine: Google Gemini 2.5 Flash / 1.5 Flash (via Google AI Studio)**
   - **Alasan**: Mendukung input teks, gambar (OCR struk/nota), dan audio (*voice note*) secara *native* dalam satu model tanpa perlu modul STT (Speech-to-Text) terpisah. Free tier 15 RPM sangat mencukupi kebutuhan keluarga.
3. **Pola Pemrosesan (Ingestion Pipeline)**:
   ```mermaid
   sequenceDiagram
       actor User as Anggota Keluarga
       participant TG as Telegram Bot
       participant Webhook as Next.js API (/api/bot/telegram)
       participant Gemini as Google Gemini 2.5 Flash
       participant DB as Supabase DB & Storage

       User->>TG: Kirim Teks / Foto Struk / Voice Note
       TG->>Webhook: Webhook Event Payload (JSON + File ID)
       Webhook->>TG: Download file media (jika ada foto/audio)
       Webhook->>Gemini: Prompt + System Schema + (Text/Image/Audio)
       Gemini-->>Webhook: Return Valid JSON (Amount, Category, Wallet, Items, Type)
       Webhook->>DB: Simpan Transaksi & Media
       Webhook->>TG: Balas pesan konfirmasi ("✅ Dicatat: Rp 35.000 [Makan Siang] via QRIS")
       TG-->>User: Tampilkan Notifikasi & Sisa Budget
   ```

## Keamanan & Validasi
- **Chat ID Whitelist**: Bot hanya merespons Chat ID / User ID anggota keluarga yang terdaftar dalam tabel `family_members`. Pesan dari pihak asing akan diabaikan secara otomatis.
- **Fallback / Konfirmasi**: Jika Gemini mendeteksi ambiguitas (misal nominal tidak jelas atau dompet tidak spesifik), bot akan membalas dengan pertanyaan klarifikasi atau tombol *inline keyboard*.
