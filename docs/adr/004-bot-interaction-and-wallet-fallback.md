# ADR 004: Pola Interaksi Bot, Fallback Dompet Default, dan Ekstraksi Struk Multi-Item

## Status
**Accepted** (Disetujui) — 2026-08-31

## Konteks
Saat berinteraksi dengan Bot Telegram untuk mencatat keuangan:
1. Pengguna menginginkan alur yang cepat tanpa friksi (*zero-friction*), tidak perlu mengetik detail yang repetitif atau menunggu dialog konfirmasi dua arah.
2. Nama dompet/rekening seringkali tidak disebutkan dalam chat (misal hanya mengetik *"Beli makan siang 35rb"*).
3. Foto struk belanja supermarket seringkali berisi belasan item yang perlu direkam totalnya namun tetap bisa diaudit item per item jika diperlukan.

## Keputusan
1. **Optimistic Insert with Action Buttons**:
   - Bot langsung mengekstrak entitas via Gemini Flash dan menyimpan data transaksi ke database Supabase secara *optimistic*.
   - Bot membalas dengan ringkasan transaksi beserta tombol *Inline Keyboard*:
     - `[🗑️ Batalkan Transaksi]` (Menghapus data & mengembalikan saldo dompet).
     - `[💳 Ganti Dompet / Rekening]` (Mengubah alokasi dompet jika salah).
     - `[🏷️ Ubah Kategori]` (Mengubah kategori jika klasifikasi AI kurang tepat).

2. **Per-Member Default Wallet Fallback**:
   - Setiap profil anggota keluarga (`family_members`) memiliki konfigurasi `default_wallet_id`.
   - Jika pesan/struk tidak menyebutkan rekening sumber secara spesifik:
     - Transaksi dari Ayah default ke dompet/rekening Ayah (misal: `BCA`).
     - Transaksi dari Ibu default ke dompet/rekening Ibu (misal: `Mandiri`).
     - Transaksi dari Anak default ke `Dompet Tunai / Uang Saku`.
   - Pengguna dapat mengubah dompet transaksi tersebut dalam 1 ketukan melalui tombol inline di pesan konfirmasi bot.

3. **Struk Belanja Multi-Item (Single Transaction + JSONB Metadata)**:
   - Struk supermarket/restoran disimpan sebagai **1 record transaksi utama** dengan total nominal keseluruhan (Kategori: `Belanja Bulanan / Groceries`).
   - Seluruh rincian item (nama barang, kuantitas, harga per item) disimpan di kolom `parsed_metadata (JSONB)` dengan struktur:
     ```json
     {
       "merchant": "Indomaret",
       "items": [
         {"name": "Susu UHT 1L", "qty": 2, "price": 19500},
         {"name": "Roti Gandum", "qty": 1, "price": 16000}
       ],
       "drive_file_id": "1A2B3C...",
       "drive_view_url": "https://drive.google.com/..."
     }
     ```

4. **Telegram First Ingestion**:
   - Telegram Bot API dipilih sebagai saluran bot utama pada fase MVP karena kestabilan tinggi, dukungan audio native OGG Opus, dan API resmi tanpa risiko banned.

## Konsekuensi
- **Positif**:
  - Pencatatan selesai dalam 1 detik dengan 1 pesan tunggal.
  - Kesalahan tebakan AI dapat dikoreksi langsung via tombol inline tanpa perlu membuka web dashboard.
  - Skema database tetap bersih dan tidak membengkak ribuan baris transaksi untuk belanjaan supermarket reguler.
- **Negatif / Mitigasi**:
  - Pengguna mungkin tidak menyadari jika AI salah mengkategorikan jika tidak membaca balasan bot.
  - *Mitigasi*: Notifikasi balasan bot dibuat ringkas dan kontras dengan emoji visual (contoh: `✅ Dicatat: Rp 55.000 [Belanja Bulanan] via BCA`).
