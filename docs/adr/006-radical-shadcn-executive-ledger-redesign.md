# ADR 006: Perombakan Radikal ke Shadcn/UI Executive Clean Ledger

## Status
ACCEPTED

## Konteks
Aplikasi **F&R Family Hub** memerlukan perombakan tampilan menyeluruh agar menyatu secara native dengan ekosistem **Shadcn/UI**, tipografi resmi Vercel (**Geist Sans + Geist Mono**), serta menerapkan prinsip desain **`/frontend-design`** (estetika unik, densitas data tinggi, border ultra-tipis, dan penghapusan anti-pattern AI Slop).

Melalui sesi wawancara terarah `/grill-me`, telah disepakati 5 keputusan desain fundamental:
1. **Aesthetic Direction**: *Executive Clean Ledger* (Linear/Vercel style).
2. **App Shell**: *Collapsible App Sidebar (Shadcn Sidebar)* di sisi kiri menggantikan top navbar lama.
3. **Color Tokens & Theming**: *Zinc Deep Monochrome + Dual Theme (Light & Dark Mode)* dengan `#09090b` dark mode dan dukungan `next-themes`.
4. **Typography**: *Geist Sans & Geist Mono* dengan penegasan angka finansial berbasis `tabular-nums` dan `font-mono`.
5. **Feedback & Overlays**: Integrasi `sonner` Toaster dan modal dialog terpusat.

## Keputusan Desain & Implementasi

### 1. Fondasi Token & Tipografi
- Memperbarui `src/app/globals.css` dengan CSS Variables palet Zinc murni untuk `:root` dan `.dark`, termasuk token `--sidebar-*`.
- Menggunakan font `GeistSans` dan `GeistMono` dari paket lokal `geist` untuk performa instan tanpa latensi unduhan jaringan.
- Memperbarui `components.json` dengan `baseColor: "zinc"`.

### 2. App Shell & Navigasi Terpadu (`AppShell`)
- Mengimplementasikan `src/components/ui/sidebar.tsx` (Shadcn Sidebar primitive dengan dukungan keyboard shortcut `⌘B`/`Ctrl+B`, cookie state persistence, dan drawer responsif di mobile).
- Membuat `src/components/layout/app-sidebar.tsx` yang memuat logo brand, tombol shortcut catat transaksi, link navigasi menu utama, dan profil keluarga.
- Membuat `src/components/layout/app-header.tsx` ramping dengan `SidebarTrigger`, Breadcrumbs dinamis per halaman, indikator status API realtime, dan `ThemeToggle`.
- Membungkus seluruh 5 halaman modul (`/`, `/assets`, `/vault`, `/family`, `/logs`) dengan komponen pembungkus tunggal `<AppShell>`.

### 3. Densitas & Tipografi Angka Finansial
- Seluruh angka nominal Rupiah (`formatRupiah`), saldo rekening, persentase pagu anggaran, dan latensi AI diformat menggunakan kelas `font-mono` dan `tabular-nums` untuk menjamin *Zero Cumulative Layout Shift* (CLS).
- Mengintegrasikan notifikasi toast `sonner` pada aksi penting (seperti pemicu scanner pengingat Telegram dan penghapusan berkas).

## Konsekuensi & Keuntungan
- **Antarmuka Premium & Profesional**: Tampilan visual kini sangat tajam, kohesif, dan bernyawa ala dashboard finansial eksekutif modern.
- **Navigasi Intuitif**: Pengguna dapat dengan mudah berpindah modul dari sidebar yang dapat di-collapse sesuai kebutuhan ruang layar.
- **Dukungan Dark Mode Murni**: Pergantian mode gelap dan terang berjalan instan tanpa flicker.
- **Bebas Error & Type-Safe**: Seluruh komponen lolos verifikasi kompilasi TypeScript (`tsc --noEmit`) dengan 0 error.
