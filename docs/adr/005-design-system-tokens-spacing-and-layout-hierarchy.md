# ADR 005: Desain Sistem Terpadu, Skala Jarak (Spacing Tokens), dan Arsitektur Layout Purpose-Driven

## Status
DRAFT (In Progress via `/grill-with-docs`)

## Konteks
Aplikasi F&R Family Hub sebelumnya memiliki gejala "AI Slop" di mana setiap halaman dipaksakan memiliki template yang seragam (4 kartu metrik di atas + tabel/feed di bawah) serta variasi jarak (*padding*, *margin*, *gap*) yang tidak konsisten akibat penambahan komponen secara bertahap tanpa pedoman desain yang terkunci.

Pengguna meminta standardisasi menyeluruh terhadap ukuran, jarak, dan pembuangan anti-pattern generik AI.

## Keputusan Desain (Resolusi Bertahap)

### 1. Filosofi Tata Letak: Purpose-Driven Layout (Anti-Template 4 Kartu)
- **Keputusan**: Menghapus kebiasaan memaksakan 4 kartu metrik di bagian atas seluruh halaman.
- **Implementasi per Modul**:
  - **Keuangan (`/`)**: Pusat Kendali Arus Kas (*Cashflow & Budget Command Center*). Mempertahankan metrik saldo kas, pemasukan, pengeluaran, dan pagu anggaran bulanan.
  - **Aset & Hutang (`/assets`)**: Buku Besar Kekayaan & Portofolio (*Portfolio & Amortization Ledger*). Fokus pada neraca aset fisik/investasi vs amortisasi cicilan hutang.
  - **Brankas Dokumen (`/vault`)**: Rak Arsip Digital & Timeline Jatuh Tempo (*Document Registry & Expiry Timeline*). Menampilkan filter status cepat (Aktif, Segera Habis, Kedaluwarsa) langsung menyatu dengan rak dokumen tanpa kartu metrik redundan.
  - **Keluarga (`/family`)**: Direktori Anggota & Analitik Kontribusi (*Family Roster & Expense Breakdown*). Layout profil anggota keluarga dengan visualisasi proporsi belanja terpadu.
  - **Log Aktivitas (`/logs`)**: Stream Pemantauan Sistem (*Activity & Process Stream*). Tampilan panel monitor konsol real-time.

### 2. Standarisasi Skala Jarak (Strict 8pt Spacing Tokens)
- **Keputusan**: Mengunci seluruh padding, margin, dan jarak antar-elemen ke dalam token berbasis 8pt grid terpadu:
  - **Padding Kontainer Halaman**: `max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6`
  - **Jarak Antar Seksi Utama**: `space-y-6` (24px)
  - **Padding Kartu & Panel Utama**: `p-5` (20px)
  - **Padding Kartu Daftar Kompak (List Item)**: `p-4` (16px)
  - **Jarak Antar Kolom Layout (Split Grid)**: `gap-6` (24px)
  - **Jarak Antar Kartu Grid (Card Grid)**: `gap-4` (16px)
  - **Jarak Form Field**: `space-y-4` (16px)
  - **Jarak Label ke Input Field**: `space-y-1.5` (6px)
  - **Tinggi Input & Tombol Form**: `h-9` (36px) terstandarisasi untuk seluruh modal dialog

### 3. Skala Tipografi Terkunci & Angka Tabular (Typography & Tabular Numerals)
- **Keputusan**: Menetapkan 6 hierarki tipografi baku di seluruh antarmuka dan melarang ukuran font arbitrer acak:
  1. **Page Header (H1)**: `text-3xl font-bold tracking-tight`
  2. **Section Header (H2)**: `text-lg font-semibold tracking-tight`
  3. **Card/Item Title**: `text-sm font-semibold text-foreground`
  4. **Financial Metric Value**: `text-2xl font-bold tracking-tight tabular-nums`
  5. **Body Text**: `text-sm leading-relaxed text-foreground`
  6. **Caption / Label / Sub-info**: `text-xs text-muted-foreground`
  7. **Micro-Badge / Tag**: `text-[11px] font-medium`
- **Aturan Angka**: Seluruh nominal Rupiah, persentase, tanggal, dan angka wajib menyertakan kelas `tabular-nums` untuk mencegah pergeseran layout (*layout shift*) saat angka diperbarui.

### 4. Standarisasi Permukaan, Radius, dan Eliminasi Dekorasi AI-Slop
- **Keputusan**: Menghapus dekorasi visual generik AI dan menetapkan standar permukaan yang tenang (*calm & purposeful*):
  - **Radius Sudut Kartu & Panel**: `rounded-xl` (12px) secara universal.
  - **Radius Sudut Kontrol & Tombol**: `rounded-md` (6px).
  - **Radius Status Badges & Pills**: `rounded-full` dengan padding `px-2.5 py-0.5`.
  - **Eliminasi Kotak Ikon 40px Berlebih**: Mengganti wadah kotak ikon `size-10 bg-.../10` yang mencolok dengan ikon fungsional terintegrasi (`size-4` atau `size-4.5` dengan warna semantik terarah) yang tidak membajak fokus mata.
  - **Elevasi Tunggal (Single Elevation Rule)**: Menggunakan border bersih 1px (`border bg-card text-card-foreground`) tanpa tumpukan bayangan norak (`shadow` berlebihan dilarang). Hover state ditandai dengan transisi warna border (`hover:border-primary/40 transition-colors`).

### 5. Arsitektur Modul Bebas AI-Slop (Purposeful Module Restructuring)
- **Keputusan**:
  - **Brankas Dokumen (`/vault`)**:
    - Menghapus 4 kartu stat redundan di atas.
    - Mengintegrasikan jumlah dokumen langsung ke dalam status tab/chips filter: `[Semua (N)]`, `[Segera Habis (N)]` (dengan warna amber), `[Kedaluwarsa (N)]` (dengan warna merah), `[Aktif (N)]`, dan `[Permanen (N)]`.
    - Kartu dokumen difokuskan pada keterbacaan: nomor dokumen monospace, badge masa berlaku visual, tautan berkas cloud, dan aksi edit/hapus.
  - **Keluarga (`/family`)**:
    - Menghapus 4 kartu stat redundan di atas.
    - Menyajikan ringkasan total pengeluaran keluarga dan visualisasi proporsi kontribusi langsung di panel analitik belanja.
    - Menampilkan roster profil anggota keluarga secara bersih dengan status integrasi Telegram dan dompet default.
  - **Aset & Hutang (`/assets`)**:
    - Mengkonsolidasikan ringkasan kekayaan bersih (Net Worth) ke dalam satu panel neraca terpadu yang proporsional tanpa kartu yang bertumpuk.
  - **Keuangan (`/`)**:
    - Menjaga kartu ringkasan arus kas tetap bersih dengan ikon terintegrasi 16px (bukan kotak 40px berwarna-warni) dan angka `tabular-nums`.

## Konsekuensi & Dampak
- **Positif**:
  - Tampilan visual tidak lagi terasa seperti buatan AI generik / template instan.
  - Hirarki visual jelas dan informasi langsung terlihat tanpa harus scroll jauh ke bawah.
  - Seluruh komponen mematuhi sistem token 8pt grid, memudahkan pemeliharaan jangka panjang.
- **Negatif**:
  - Komponen kartu ringkasan di `/vault` dan `/family` dihapus atau direfaktor, membutuhkan penyesuaian kode pada halaman tersebut.
