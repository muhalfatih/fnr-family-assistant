# F&R Family Hub — Design System & Spacing Tokens Specification

Dokumen panduan desain resmi untuk memastikan konsistensi komponen, ukuran, jarak (*spacing*), dan membuang kebiasaan desain generik ("AI Slop") di seluruh aplikasi F&R Family Hub.

---

## 1. Prinsip Desain Inti (*Design Principles*)

1. **Purpose-Driven Layout (Anti-Template 4 Kartu)**: Setiap modul dirancang khusus sesuai tugas utamanya, bukan sekadar menempelkan 4 kartu metrik kotak di bagian atas.
2. **Restraint & Purposeful Contrast**: Jangan gunakan kotak ikon 40px berwarna-warni di setiap sudut. Gunakan ikon 16px (`size-4`) yang terintegrasi secara tenang dan fungsional.
3. **Strict 8pt Spacing Rhythm**: Tidak ada lagi jarak acak (`p-3`, `p-3.5`, `p-5`). Seluruh padding dan margin mengikuti kelipatan 4px / 8px grid standar.
4. **Information Architecture**: Struktur visual menyampaikan informasi nyata, bukan dekorasi kosong.

---

## 2. Token Jarak Baku (*Spacing Tokens Reference*)

| Kategori | Token Tailwind | Nilai Piksel | Penggunaan Wajib |
| :--- | :--- | :--- | :--- |
| **Page Outer Container** | `p-4 sm:p-6 lg:p-8` | 16px / 24px / 32px | Padding wadah `<main>` di setiap halaman |
| **Page Max Width** | `max-w-7xl mx-auto` | 1280px | Batas lebar konten desktop |
| **Section Gap Rhythm** | `space-y-6` | 24px | Jarak vertikal antar-seksi utama di halaman |
| **Primary Card Padding** | `p-5` | 20px | Padding dalam kartu panel & summary |
| **Compact List Padding** | `p-4` | 16px | Padding dalam kartu list dokumen & item transaksi |
| **Main Grid Gap** | `gap-6` | 24px | Jarak antar-kolom layout terpisah (Split Grid) |
| **Component Grid Gap** | `gap-4` | 16px | Jarak antar-kartu dalam grid responsif |
| **Form Group Spacing** | `space-y-4` | 16px | Jarak vertikal antar-baris input dalam form dialog |
| **Label-to-Input Gap** | `space-y-1.5` | 6px | Jarak antara `<Label>` dan elemen `<Input>`/`<Select>` |
| **Control Height** | `h-9` | 36px | Tinggi standar tombol aksi kompak & form input |

---

## 3. Skala Tipografi Baku (*Typography Hierarchy*)

| Peran Tipografi | Kelas Tailwind Wajib | Bobot Font | Karakteristik & Penggunaan |
| :--- | :--- | :--- | :--- |
| **Page Title (H1)** | `text-3xl tracking-tight` | `font-bold` | Judul utama halaman (misal: "Keuangan & Arus Kas") |
| **Section Title (H2)**| `text-lg tracking-tight` | `font-semibold` | Judul seksi di atas tabel atau daftar |
| **Card / Item Title** | `text-sm` | `font-semibold` | Nama transaksi, nama dokumen, nama anggota |
| **Financial Metric** | `text-2xl tracking-tight tabular-nums` | `font-bold` | Angka nominal Rupiah, saldo, net worth |
| **Body Content** | `text-sm leading-relaxed` | `font-normal` | Paragraf deskripsi atau penjelasan |
| **Caption / Label** | `text-xs text-muted-foreground` | `font-normal` / `font-medium` | Keterangan bawah, label input form, tanggal |
| **Status Tag / Badge**| `text-[11px]` | `font-medium` | Badge status (Aktif, Admin, Segera Habis) |

> ⚠️ **Aturan Angka Finansial**: Seluruh nominal Rupiah, persentase, dan angka wajib menggunakan kelas **`tabular-nums`** untuk memastikan lebar angka tetap stabil dan tidak meloncat saat data diperbarui.

---

## 4. Standar Radius & Permukaan (*Radii & Surface Floor*)

- **Radius Kartu & Panel**: Wajib `rounded-xl` (12px).
- **Radius Tombol & Input**: Wajib `rounded-md` (6px).
- **Radius Status Badges**: Wajib `rounded-full` (Pill).
- **Elevasi & Border**: Gunakan border 1px bersih `border border-border/80 bg-card`. Dilarang menumpuk bayangan tebal (`box-shadow`) di atas border.
- **Hover State**: Transisi warna border yang halus: `hover:border-primary/40 transition-colors`.

---

## 5. Daftar Pantangan "Anti-AI-Slop" (*AI Slop Checklist*)

- ❌ **Dilarang**: Memaksakan 4 kartu kotak di bagian atas setiap halaman jika tidak ada 4 metrik independen yang penting.
- ❌ **Dilarang**: Menggunakan kotak ikon 40px berwarna-warni di setiap baris data.
- ❌ **Dilarang**: Menggunakan teks gradien pelangi (*gradient text*) sebagai pengganti penegasan visual.
- ❌ **Dilarang**: Menggunakan elemen form HTML mentah (`<select>` atau `<input type="checkbox">`). Selalu gunakan komponen Shadcn Radix UI (`@/components/ui/select`, dsb).
- ❌ **Dilarang**: Ukuran font arbitrer di bawah 11px seperti `text-[9px]` atau `text-[10px]`.
