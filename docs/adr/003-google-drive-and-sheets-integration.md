# ADR 003: Integrasi Google Drive untuk Media/Struk & Real-Time Sync Google Sheets

## Status
**Superseded Partially by Cloudflare R2** (Komponen Google Drive media storage digantikan sepenuhnya oleh Cloudflare R2; Sinkronisasi Google Sheets tetap aktif) — 2026-09-04

## Konteks
Sistem **F&R Family Hub** memerlukan penyimpanan berkas media (foto nota/struk belanja, dokumen legal) dan replikasi data transaksi ke Google Sheets:
1. Pengguna menginginkan foto struk dan dokumen keluarga tersimpan di Google Drive keluarga agar mudah diakses langsung melalui aplikasi Google Drive di smartphone.
2. Pengguna menginginkan pencatatan di Google Sheets selalu mutakhir (*real-time*) setiap kali ada transaksi baru yang masuk via Telegram Bot maupun Web Dashboard.
3. Seluruh proses backend berjalan serverless tanpa mengharuskan pengguna melakukan login OAuth Google secara berulang-ulang setiap kali bot memproses pesan.

## Keputusan
1. **Google Service Account sebagai Jembatan API**:
   - Backend Next.js menggunakan *Google Cloud Service Account* (dengan kredensial `service_account.json` / Environment Variables).
   - Service account diberi akses Editor ke:
     - **Google Drive Shared Folder**: `F&R Family Hub/` dengan struktur sub-folder otomatis `Struk/{YYYY}/{MM}/` dan `Dokumen/{Kategori}/`.
     - **Google Spreadsheet Keluarga**: Dokumen master Google Sheets tempat pencatatan transaksi harian.

2. **Kebijakan Akses Google Drive (Sharing Policy)**:
   - File foto struk yang diunggah ke Google Drive diberi izin `Anyone with link can view` (atau dishare ke domain/email keluarga).
   - Backend menyimpan `drive_file_id`, `web_view_link`, dan `thumbnail_link` di tabel `transactions` / `documents` Supabase sehingga Web Dashboard dan Bot Telegram dapat menampilkan gambar secara langsung tanpa proxy lambat.

3. **Sinkronisasi Real-Time ke Google Sheets (Instant Append)**:
   - Setiap kali transaksi berhasil disimpan ke Supabase PostgreSQL, pipeline backend langsung memanggil `sheets.spreadsheets.values.append` untuk menambahkan baris baru pada tab bulanan/tahunan di Google Sheets.
   - Kolom yang di-sync: `Tanggal`, `Tipe (Pemasukan/Pengeluaran/Transfer)`, `Kategori`, `Nominal`, `Dompet/Rekening`, `Catatan/Deskripsi`, `Dicatat Oleh (Member)`, `Link Foto Struk Google Drive`.

## Konsekuensi
- **Positif**:
  - Foto struk tersusun rapi di Google Drive keluarga tanpa memakan kuota 1GB Supabase Free Storage.
  - Anggota keluarga bisa membuka Google Sheets kapan saja di HP dan melihat data transaksi yang selalu up-to-date detik itu juga.
  - Zero-maintenance bagi pengguna: Tidak ada sesi login OAuth yang kedaluwarsa karena menggunakan Service Account.
- **Negatif / Mitigasi**:
  - API Google Drive dan Google Sheets memiliki *quota rate limit* (meskipun kuota gratis Google Cloud 300 request/menit jauh melampaui kebutuhan keluarga).
  - *Mitigasi*: Eksekusi sync Google Sheets dijalankan secara non-blocking (*asynchronous post-response*) agar respons balasan bot Telegram tetap instan (< 1.5 detik).
