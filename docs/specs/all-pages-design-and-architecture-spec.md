# Specification: F&R Family Hub — All Pages Architecture & Interface Design System

## Problem Statement

Aplikasi manajemen keluarga multikanal F&R Family Hub sebelumnya mengalami masalah inkonsistensi antarmuka (*UI inconsistency*), kebiasaan tata letak generik ("AI Slop" dengan 4 kartu metrik identik di setiap modul), pergeseran tata letak (*layout shift* akibat angka non-tabular dan penempatan indikator animasi), serta komponen form yang menggunakan elemen bawaan browser yang tidak seragam (seperti `<input type="date">` mentah tanpa lokalisasi bahasa Indonesia).

Pengguna dan anggota keluarga membutuhkan antarmuka yang kohesif, tenang (*calm & purposeful*), memiliki ritme jarak grid 8pt yang presisi, bebas dari redundansi tombol atau label berlebih (*distilled*), serta menyediakan kendali keuangan, pengelolaan arsip dokumen penting, portofolio aset/hutang, profil keluarga, dan pemantauan bot chat AI dalam satu kesatuan sistem yang solid dan responsif di seluruh perangkat.

## Solution

Mengembangkan dan membakukan sistem desain terpadu (*Unified Design System & Architecture*) untuk seluruh 5 modul utama aplikasi (`/`, `/assets`, `/vault`, `/family`, `/logs`) dengan karakteristik:
1. **Purpose-Driven Layout**: Setiap modul memiliki komposisi antarmuka yang disesuaikan secara unik untuk menyelesaikan tugas intinya (*task-oriented*), tanpa memaksakan template kartu yang seragam.
2. **Universal Component Standardization**: Menggunakan komponen UI berbasis Radix UI & Tailwind CSS dengan dukungan lokalisasi Indonesia penuh, termasuk pemilih tanggal (`DatePicker`) kalender popover, dropdown terstruktur (`Select`), modal konfirmasi, dan input form standar tinggi `h-9`.
3. **Strict 8pt Spacing Rhythm & Tabular Numerals**: Seluruh padding, margin, gap, dan sudut radius (`rounded-xl` untuk panel, `rounded-md` untuk kontrol) terstandarisasi. Seluruh angka finansial, persentase, dan waktu menggunakan kelas `tabular-nums` untuk stabilitas visual.
4. **Distilled & Redundancy-Free Experience**: Menghilangkan tombol aksi dan label duplikat di dalam sub-header kartu, menyederhanakan baris feed transaksi menjadi minimalis, dan mengkonsolidasikan filter dokumen di Brankas menjadi satu baris toolbar terpadu di atas lipatan layar (*above the fold*).
5. **Robust Multimodal Bot & Document Reminder Engine**: Integrasi bot Telegram/WhatsApp yang andal dengan pengurai pesan berbasis HTML-safe entities, pelacakan proses aktif dengan tombol pembatalan seketika, dan broadcast pengingat dokumen kedaluwarsa multi-penerima.

---

## User Stories

### Modul 1: Keuangan & Arus Kas (`/`)
1. As a family head, I want to see the real-time total cash balance across all family wallets, so that I know our current financial liquidity.
2. As a family member, I want to view monthly income and monthly expenses side-by-side with tabular formatting, so that I can monitor whether our cashflow is surplus or deficit.
3. As a family financial manager, I want to see our remaining monthly budget progress bar with clear warning thresholds (yellow at 80%, red over 100%), so that the family does not overspend before month-end.
4. As a user, I want to filter the financial dashboard by time period (Semua Waktu, Bulan Ini, Bulan Lalu, Tahun Ini), so that I can analyze historical spending patterns.
5. As a user, I want to add income and expense transactions through a standardized modal with an Indonesian datepicker, category selection, and wallet assignment, so that transactions recorded via web match the quality of bot inputs.
6. As a user, I want to search transaction history by keyword (merchant, note, member name, wallet, or category), so that I can quickly find specific past expenses.
7. As a user, I want to filter transaction history by type (Semua, Pengeluaran, Pemasukan), so that I can review income streams separately from expenses.
8. As a user, I want to expand receipt transactions to see itemized grocery items and prices, so that I have full item-level transparency without leaving the dashboard.
9. As a user, I want to click a direct link to view original receipt photos stored in Google Drive, so that I can verify purchase proof when needed.
10. As a user, I want to delete accidental or duplicate transactions with an explicit confirmation dialog, so that family ledger data remains accurate and clean.
11. As a user, I want to manage and add family wallets (bank accounts, e-wallets, cash) from a dedicated modal, so that our multi-wallet balances stay synchronized.
12. As a user, I want to adjust monthly budget caps per spending category, so that spending limits reflect current household needs.

### Modul 2: Aset & Hutang (`/assets`)
13. As a family planner, I want an executive balance sheet overview showing Total Asset Value, Total Outstanding Liabilities, and Net Worth, so that I understand the family's true financial solvency.
14. As a user, I want to see a visual ratio bar comparing total assets to liabilities, so that I can quickly evaluate debt-to-asset health.
15. As a user, I want to record physical and investment assets (properties, vehicles, precious metals/gold, stock portfolios, electronics), so that our family wealth inventory is complete.
16. As a user, I want to see acquisition dates and estimated market values for every asset item, so that we know asset age and capital appreciation.
17. As a user, I want to record loan liabilities (mortgages, vehicle installments, credit cards, personal loans) with total principal, remaining balance, and monthly installment amounts, so that debt obligations are never overlooked.
18. As a user, I want to track the loan payoff progress percentage and recurring monthly due day for each debt, so that monthly installments are paid on time.
19. As a user, I want to remove settled debts or liquidated assets from the ledger with one click, so that the active balance sheet remains up to date.

### Modul 3: Brankas Dokumen (`/vault`)
20. As a family organizer, I want a secure central vault for all critical family documents (KTP, KK, Paspor, STNK, BPKB, Polis Asuransi, Sertifikat Tanah, NPWP), so that physical paperwork is always backed up digitally.
21. As a user, I want to see an urgent alert banner whenever any family document has expired or is nearing expiry within 30 days, so that we avoid penalties and administrative disruption.
22. As a user, I want to filter documents instantly using a single compact toolbar with keyword search, category dropdown, and status tabs with live document counts, so that I can locate documents in seconds without excessive scrolling.
23. As a user, I want each document card to display its document number in monospace font, exact expiry date in Indonesian locale, and direct Google Drive file viewer link, so that document numbers can be copied accurately and original scans accessed immediately.
24. As a user, I want to trigger an automated Telegram reminder with one click, broadcasting structured HTML expiry warnings to all registered family members on Telegram.
25. As a user, I want to set customizable reminder lead times (e.g., 7, 30, 60 days before expiry) per document, so that documents requiring complex renewal processes give sufficient advance notice.
26. As a user, I want to add and edit document metadata using Indonesian popover calendar pickers, so that expiry dates are entered without formatting errors.

### Modul 4: Anggota Keluarga (`/family`)
27. As a family head, I want a family roster displaying all registered members with their household roles (Kepala Keluarga, Pasangan, Anak), default wallets, and Telegram linking status.
28. As a user, I want to link family members to their respective Telegram Chat IDs, so that incoming chat transactions and receipt photos are automatically attributed to the correct person.
29. As a user, I want to view a monthly spending contribution donut chart showing the percentage breakdown of household expenses incurred by each member.
30. As a user, I want to see the top spending category and transaction count per member, so that we can have constructive, transparent household financial discussions.
31. As a user, I want unassigned transactions (recorded before member linking) clearly flagged and totaled, so that legacy expenses are not lost.
32. As a user, I want to add new family members with custom avatars and color themes through a standardized modal, so that family roster changes are effortless.

### Modul 5: Log Aktivitas & Pemantauan Chat AI (`/logs`)
33. As an administrator, I want a live process banner indicating AI background execution state, so that I know whether the bot is currently processing an image, audio note, or text prompt.
34. As a user, I want to force-cancel (*kill process*) any hanging or long-running AI task exceeding expected latency directly from the web dashboard, so that system resources are released.
35. As an administrator, I want a comprehensive log table recording all inbound bot interactions across Telegram and WhatsApp with execution latency, sender identity, and status badges (Berhasil, Gagal, Timeout, Dibatalkan).
36. As a user, I want to filter activity logs by communication channel and execution status, so that I can diagnose issues or review usage per channel.
37. As an administrator, I want to click any log row to inspect the full raw prompt, AI parsed metadata (structured JSON extracted from receipts), and detailed error traces, so that debugging OCR or parsing anomalies is straightforward.

---

## Implementation Decisions

### 1. Global Layout & Spacing Architecture
- **Page Container**: Universal standard `max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6` applied across all 5 top-level page routes.
- **Card Elevation & Radii**: Universal `rounded-xl border border-border/80 bg-card` with single elevation border. Zero heavy drop-shadows. Internal card padding standardized to `p-5` (primary panels) and `p-4` (compact items).
- **Form Controls & Inputs**: Form input fields and action buttons standardized to `h-9 text-xs rounded-md`. Interactive touch targets on mobile maintain accessible tap areas.
- **Anti-Layout Shift (Zero Cumulative Layout Shift)**:
  - Financial numbers, dates, latency metrics, and percentages strictly use `tabular-nums`.
  - Header animation indicators are separated from semantic `<h1>` tags into dedicated companion badges to eliminate header jitter during background polling.

### 2. Indonesian Universal DatePicker Component
- **Component Architecture**: Reusable popover component leveraging `react-day-picker` wrapped inside Radix UI `Popover` and styled with Tailwind CSS.
- **Locale Integration**: Configured with `date-fns/locale/id` for Indonesian month names, day abbreviations, and formatted date strings (`dd MMMM yyyy`).
- **Standard Trigger**: Styled as a form button `h-9 text-xs font-normal border-input rounded-md` with `CalendarIcon` prefix and clear placeholder text ("Pilih tanggal").

### 3. Unified Single-Row Vault Filter Toolbar
- **Consolidation**: Merged previous multi-row layout (separate search input + 8 category chip buttons + status tabs) into a single responsive toolbar row:
  - Left: Search input (`flex-1`) + Category dropdown `<Select>` (`w-[145px]`).
  - Right: Horizontal status tab pills with live count badges (`[Semua]`, `[Segera Habis]`, `[Kedaluwarsa]`, `[Aktif]`, `[Permanen]`).
- **Result**: Reduced vertical footprint by ~60px, ensuring document cards render above the fold on desktop and tablet screens.

### 4. High-Efficiency Transaction Feed & Asset Rows
- **Visual Weight Reduction**: Replaced bulky 40px bordered colored boxes on every list row with lightweight 32px directional badges (`size-8 rounded-md bg-muted/60`), creating a calm, high-density ledger aesthetic.
- **Redundancy Elimination**: Removed secondary duplicate CTA buttons and repeated total value captions from CardHeaders in `/assets` and `/logs`, keeping the Page Header as the single source of primary actions.

### 5. Multi-Recipient HTML Document Reminder Engine
- **Endpoint Protocol**: Route handler supports both HTTP `GET` (for scheduled cron / bot webhooks) and `POST` (for dashboard UI triggers).
- **HTML Message Entity Parser**: Replaced error-prone Markdown formatting with HTML tags (`<b>`, `<i>`, `<code>`, `<a>`) and an XML entity escaping utility to guarantee that special characters in document titles (e.g. `_`, `*`, `[`, `-`) never trigger Telegram API 400 Bad Request errors.
- **Multi-Member Broadcast**: Queries all family members with active `telegram_chat_id` and broadcasts personalized reminder cards with direct Google Drive links.

---

## Testing Decisions

### What Makes a Good Test
Tests in this system evaluate **external user-observable behavior and contracts** rather than internal component implementation details:
- Correctness of currency formatting, Indonesian date translations, and tabular number rendering.
- Accurate calculation of net worth (Assets minus Liabilities), budget remaining percentages, and document expiry day differences.
- HTTP contract compliance of API routes (status codes, JSON schemas, multi-recipient handling).
- Zero design defect regressions via automated static scanning.

### Modules to Test
1. **API Endpoints**:
   - `/api/documents/remind`: Verify GET and POST handler responses, HTTP 200 on valid data, 400 on unlinked Telegram IDs, and multi-recipient dispatch.
   - `/api/bot/tasks`: Verify task registration, heartbeat polling, and graceful cancellation.
   - `/api/documents`, `/api/transactions`, `/api/assets`, `/api/liabilities`, `/api/family/members`: Verify CRUD data contracts.
2. **Utility & Calculation Functions**:
   - `formatRupiah`, `formatDateIndo`, date difference math for document expiration warnings and loan payoff percentages.
3. **UI Static Quality & Type Invariants**:
   - `tsc --noEmit` across all project files.
   - `detect.mjs` mechanical design token detector across all components.
   - Global zero em-dash (`—`) compliance.

### Prior Art & Existing Testing Seams
- Next.js API Route handler test suites with Node.js `fetch` integration.
- Mechanical CLI detector scripts (`.agents/skills/impeccable/scripts/detect.mjs`) ensuring zero unapproved design tokens.

---

## Out of Scope

1. Multi-tenant SaaS billing, multi-family workspaces, or third-party OAuth provider login (the application is private to the F&R household).
2. Direct banking API integrations / Open Banking synchronization (transactions are recorded via Telegram bot, WhatsApp bot, OCR receipts, and manual web entry).
3. Native mobile iOS / Android binary compilation (the application is delivered as a fully responsive Progressive Web App / Web Dashboard).
4. Direct in-browser PDF optical character recognition (OCR is performed server-side by the Gemini Multimodal AI engine).

---

## Further Notes

- **Font Family**: Plus Jakarta Sans (`var(--font-plus-jakarta-sans)`) used universally across headings, body, and UI elements.
- **Iconography**: Lucide React (`lucide-react`) with standard stroke widths and explicit sizes (`size-3.5`, `size-4`, `size-5`).
- **SEO & Indexing Policy**: Private family application with `robots: { index: false, follow: false }` metadata configured in root layout.
- **Design System Reference**: Detailed spacing token reference and architecture decisions are formally documented in `docs/adr/005-design-system-tokens-spacing-and-layout-hierarchy.md` and `docs/design-system-and-glossary.md`.
