# Panduan Lengkap Setup Cloudflare R2 — F&R Family Hub

Panduan ini berisi langkah-langkah praktis dan terkini untuk mengonfigurasi **Cloudflare R2 Object Storage** sebagai tempat penyimpanan berkas foto struk transaksi (Telegram/WhatsApp) dan dokumen brankas keluarga (Vault).

---

## 🎯 Keunggulan Cloudflare R2 untuk F&R Family Hub

1. **Gratis 10 GB / bulan selamanya** (Free Tier).
2. **Bebas biaya transfer data keluar (Zero Egress Fees)**: Tidak ada tagihan bandwidth saat melihat foto struk atau mengunduh dokumen.
3. **Kompatibel penuh dengan AWS S3 API**: Terhubung menggunakan pustaka standar `@aws-sdk/client-s3`.
4. **Resilient Fallback**: Aplikasi F&R Family Hub memiliki sistem otomatis yang akan menyimpan berkas ke server lokal jika koneksi R2 belum dikonfigurasi, sehingga aplikasi tidak akan pernah *crash*.

---

## 📋 Langkah Demi Langkah Konfigurasi di Cloudflare Dashboard

### Langkah 1: Buat R2 Bucket Baru

1. Masuk ke [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Pada menu navigasi di bilah kiri, klik **Storage & Databases** ➔ pilih **R2**.
3. Di halaman R2, klik tombol biru **Create bucket**.
4. Isi detail bucket:
   - **Bucket name**: Masukkan nama unik, misalnya: `fnr-family-media` *(hanya huruf kecil, angka, dan tanda hubung)*.
   - **Location**: Pilih **Automatic** (Cloudflare akan otomatis memilih data center terdekat di Asia Tenggara/Singapura untuk latensi terendah).
   - **Default storage class**: Tetap pilih **Standard**.
5. Klik tombol **Create bucket** di pojok kanan bawah.

---

### Langkah 2: Aktifkan Akses Publik via Subdomain R2.dev (Untuk Foto Struk)

Agar foto struk transaksi dari Telegram/WhatsApp dapat langsung dibuka dari riwayat transaksi di dashboard, aktifkan fitur subdomain publik bawaan Cloudflare:

1. Di dalam halaman detail bucket `fnr-family-media`, klik tab **Settings**.
2. Gulir ke bawah hingga menemukan bagian **Public Access**.
3. Pada kartu **R2.dev Subdomain**, klik tombol **Allow Access** (atau **Enable**).
4. Sebuah pop-up konfirmasi akan muncul: ketik kata `allow` pada kolom teks, lalu klik **Allow**.
5. Cloudflare akan menampilkan alamat URL publik, contohnya:
   ```text
   https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
   ```
6. Salin (*copy*) URL ini. URL inilah yang akan menjadi nilai variabel `CLOUDFLARE_R2_PUBLIC_URL`.

> 🔒 **Catatan Keamanan Dokumen Brankas (Vault)**:
> Meskipun subdomain publik aktif, berkas dokumen sensitif keluarga (KTP, KK, SIM, Polis Asuransi di folder `vault/`) diakses melalui sistem **Presigned URL** berbatas waktu (1 jam). Berkas vault tidak memiliki link langsung yang mudah ditebak oleh publik.

---

### Langkah 3: Buat R2 API Token (Access Key & Secret Key)

Aplikasi membutuhkan izin API untuk dapat mengunggah dan membaca berkas di bucket R2:

1. Kembali ke halaman utama menu **R2** (klik **R2** pada menu sebelah kiri).
2. Di sebelah kanan layar, cari kotak informasi **Account Details**, lalu klik tautan **Manage R2 API Tokens**.
3. Klik tombol **Create API token**.
4. Konfigurasikan token sebagai berikut:
   - **Token name**: Beri nama, misalnya `fnr-family-hub-token`.
   - **Permissions**: Pilih **Object Read & Write** *(Penting: jangan pilih Read-only agar bot dan web bisa mengunggah berkas)*.
   - **Specify bucket(s)**: Pilih opsi **Apply to specific buckets only**, lalu centang bucket `fnr-family-media` yang baru dibuat.
   - **TTL (Masa Berlaku)**: Pilih **Forever** / tidak ada batas kedaluwarsa (atau sesuaikan dengan kebijakan keamanan Anda).
5. Klik **Create API Token** di bagian bawah.
6. Halaman konfirmasi akan memunculkan informasi penting kredensial:
   - **Access Key ID**: String acak 32 karakter (misal: `a1b2c3d4e5f6...`).
   - **Secret Access Key**: String acak 64 karakter (misal: `7g8h9i0jklmn...`).
   - **Account ID**: Tertera pada Endpoint S3 (misal pada `https://<account_id>.r2.cloudflarestorage.com`) atau di halaman utama R2 dashboard.

> ⚠️ **PENTING**: Segera salin dan simpan **Secret Access Key** sekarang. Cloudflare tidak akan pernah menampilkan Secret Access Key ini lagi setelah Anda menutup halaman tersebut!

---

### Langkah 4: Masukkan Kredensial ke `.env.local`

Buka berkas `.env.local` pada folder utama proyek F&R App Anda di komputer, lalu lengkapi bagian berikut:

```env
# ==============================================================================
# Cloudflare R2 Object Storage Configuration
# ==============================================================================
CLOUDFLARE_R2_ACCOUNT_ID="masukkan_account_id_cloudflare_anda"
CLOUDFLARE_R2_ACCESS_KEY_ID="masukkan_access_key_id_r2"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="masukkan_secret_access_key_r2"
CLOUDFLARE_R2_BUCKET_NAME="fnr-family-media"
CLOUDFLARE_R2_PUBLIC_URL="https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev"
```

---

### Langkah 5: Uji Koneksi & Verifikasi

Setelah menyimpan berkas `.env.local`, jalankan skrip pengujian otomatis yang telah disiapkan di proyek:

```powershell
node scripts/test-r2-module.mjs
```

Jika konfigurasi berhasil, output terminal akan menampilkan:
```text
=================================================
🧪 Running Cloudflare R2 Storage Test Suite
=================================================

[Test 1] isR2Configured(): ✅ Configured
[Test 2] uploadReceiptToR2(): ✅ Success
         Provider: cloudflare_r2
         URL: https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev/receipts/2026/09/test_struk.jpg
[Test 3] uploadVaultDocToR2(): ✅ Success
         Provider: cloudflare_r2
         Key: vault/identity/test_ktp.pdf
[Test 4] getPresignedDocViewUrl(): ✅ Success
         Resolved View URL: https://fnr-family-media.xxxx.r2.cloudflarestorage.com/vault/identity/test_ktp.pdf?...

=================================================
🎉 All Cloudflare R2 storage tests PASSED!
=================================================
```

---

## 📂 Struktur Penyimpanan di R2 Bucket

Aplikasi F&R Family Hub secara otomatis menyusun berkas ke dalam direktori terstruktur:

- 🧾 **Foto Struk / Nota Transaksi**:
  ```text
  receipts/YYYY/MM/<timestamp>_<nama_file>.jpg
  Contoh: receipts/2026/09/1788301234_struk_supermarket.jpg
  ```
- 🗄️ **Dokumen Brankas Keluarga (Vault)**:
  ```text
  vault/<kategori>/<timestamp>_<nama_file>.pdf
  Contoh: vault/identity/1788305678_ktp_ayah.pdf
  Contoh: vault/vehicle/1788309012_stnk_motor.pdf
  ```
