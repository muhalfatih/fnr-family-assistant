# ADR 001: Pemilihan Supabase (PostgreSQL) sebagai Primary Database & Hybrid Sync

## Status
**Accepted** (Disetujui) — 2026-08-31

## Konteks
Aplikasi **F&R Family Hub** memerlukan penyimpanan data untuk transaksi finansial keluarga, anggaran bulanan, aset, dokumen legal, dan log interaksi AI Bot. Kebutuhan utama:
1. **Integritas Relasi**: Menghindari anomali data keuangan (rekening, saldo, transfer antar-dompet).
2. **Fleksibilitas Skema**: Mampu menyimpan metadata dinamis (ekstraksi AI Gemini, detail properti/kendaraan, item rincian struk belanja) tanpa harus sering migrasi tabel.
3. **Penyimpanan Media**: Mampu menyimpan foto struk belanja dan berkas dokumen legal (KTP, STNK, Sertifikat).
4. **Biaya Operasional**: Berada dalam kuota Free Tier ($0/bulan).
5. **Kemudahan Akses**: Data dapat diakses cepat oleh web dashboard dan bot webhook, serta opsi backup ke Google Sheets.

## Keputusan
Kami memutuskan untuk menggunakan **Supabase (PostgreSQL)** sebagai primary database dan storage provider, dengan pertimbangan:
1. **Relasional & JSONB**: Menggunakan skema relasional terstruktur untuk transaksi dan dompet, serta tipe data `JSONB` untuk data dinamis dan hasil parsing AI.
2. **Row-Level Security (RLS)**: Isolasi data keluarga yang aman jika nanti mendukung multi-family.
3. **Storage Terintegrasi**: 1GB free storage untuk foto nota belanja dan dokumen keluarga.
4. **PostgREST & Client SDK**: Mempercepat pengembangan Next.js API Routes dan webhook bot.
5. **Hybrid Sync (Optional)**: Data ringkasan transaksi dapat di-mirror secara berkala ke Google Sheets untuk kemudahan audit manual jika diperlukan.

## Konsekuensi
- **Positif**:
  - Transaksi ACID aman untuk pencatatan saldo dompet dan mutasi keuangan.
  - Performa query instan (<100ms) untuk webhook bot Telegram.
  - Biaya $0 pada Supabase Free Tier.
- **Negatif / Mitigasi**:
  - Proyek Supabase pada free tier memiliki kebijakan jeda (*pause*) jika tidak aktif selama 7 hari.
  - *Mitigasi*: Aktivitas bot Telegram harian keluarga otomatis menjaga database tetap aktif (*keep-alive*).
