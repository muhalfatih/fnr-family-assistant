import {
  Wallet,
  Category,
  Transaction,
  Budget,
  Asset,
  Liability,
  LegalDocument,
  FamilyMember,
  ChatActivityLog,
  Family,
} from "@/lib/types/database";

export interface MockStore {
  family: Family;
  members: FamilyMember[];
  wallets: Wallet[];
  categories: Category[];
  budgets: Budget[];
  transactions: Transaction[];
  assets: Asset[];
  liabilities: Liability[];
  documents: LegalDocument[];
  logs: ChatActivityLog[];
}

const mockFamily: Family = {
  id: "fam-001",
  name: "Keluarga F&R",
  currency: "IDR",
  google_drive_folder_id: "mock_drive_folder_123",
  google_sheets_spreadsheet_id: "mock_sheets_id_456",
  settings: { theme: "zinc", auto_sync: true },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const mockMembers: FamilyMember[] = [
  {
    id: "mem-001",
    family_id: "fam-001",
    full_name: "Ayah (Fatih)",
    role: "admin",
    default_wallet_id: "wal-001",
    telegram_chat_id: 123456789,
    whatsapp_number: "+6281234567890",
    avatar_url: null,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "mem-002",
    family_id: "fam-001",
    full_name: "Ibu (Rania)",
    role: "admin",
    default_wallet_id: "wal-002",
    telegram_chat_id: 987654321,
    whatsapp_number: "+6281298765432",
    avatar_url: null,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "mem-003",
    family_id: "fam-001",
    full_name: "Kakak (Zaid)",
    role: "member",
    default_wallet_id: "wal-003",
    telegram_chat_id: null,
    whatsapp_number: null,
    avatar_url: null,
    created_at: "2026-01-05T00:00:00Z",
  },
  {
    id: "mem-004",
    family_id: "fam-001",
    full_name: "Adik (Maryam)",
    role: "member",
    default_wallet_id: "wal-005",
    telegram_chat_id: null,
    whatsapp_number: null,
    avatar_url: null,
    created_at: "2026-01-05T00:00:00Z",
  },
];

const mockWallets: Wallet[] = [
  {
    id: "wal-001",
    family_id: "fam-001",
    name: "BCA Prioritas",
    type: "bank",
    current_balance: 45850000,
    currency: "IDR",
    account_number: "8820192831",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "wal-002",
    family_id: "fam-001",
    name: "Mandiri Operasional",
    type: "bank",
    current_balance: 18200000,
    currency: "IDR",
    account_number: "140001928374",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "wal-003",
    family_id: "fam-001",
    name: "GoPay Family",
    type: "ewallet",
    current_balance: 2450000,
    currency: "IDR",
    account_number: "081234567890",
    is_active: true,
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "wal-004",
    family_id: "fam-001",
    name: "OVO Belanja",
    type: "ewallet",
    current_balance: 1150000,
    currency: "IDR",
    account_number: "081298765432",
    is_active: true,
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "wal-005",
    family_id: "fam-001",
    name: "Kas Tunai Rumah",
    type: "cash",
    current_balance: 3500000,
    currency: "IDR",
    account_number: "-",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "wal-006",
    family_id: "fam-001",
    name: "Bibit Reksadana",
    type: "investment",
    current_balance: 75000000,
    currency: "IDR",
    account_number: "BBT-99201",
    is_active: true,
    created_at: "2026-01-10T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
];

const mockCategories: Category[] = [
  {
    id: "cat-001",
    family_id: "fam-001",
    name: "Makanan & Kuliner",
    type: "expense",
    icon: "UtensilsCrossed",
    color: "#10b981",
    is_default: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "cat-002",
    family_id: "fam-001",
    name: "Supermarket & Sembako",
    type: "expense",
    icon: "ShoppingCart",
    color: "#3b82f6",
    is_default: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "cat-003",
    family_id: "fam-001",
    name: "Transportasi & Bensin",
    type: "expense",
    icon: "Car",
    color: "#f59e0b",
    is_default: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "cat-004",
    family_id: "fam-001",
    name: "Listrik & Air Utilitas",
    type: "expense",
    icon: "Zap",
    color: "#8b5cf6",
    is_default: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "cat-005",
    family_id: "fam-001",
    name: "Pendidikan & Kursus",
    type: "expense",
    icon: "GraduationCap",
    color: "#ec4899",
    is_default: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "cat-006",
    family_id: "fam-001",
    name: "Hiburan & Liburan",
    type: "expense",
    icon: "Film",
    color: "#f97316",
    is_default: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "cat-007",
    family_id: "fam-001",
    name: "Kesehatan & Obat",
    type: "expense",
    icon: "HeartPulse",
    color: "#ef4444",
    is_default: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "cat-008",
    family_id: "fam-001",
    name: "Gaji & Pendapatan Tetap",
    type: "income",
    icon: "Briefcase",
    color: "#10b981",
    is_default: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "cat-009",
    family_id: "fam-001",
    name: "Dividen & Investasi",
    type: "income",
    icon: "TrendingUp",
    color: "#3b82f6",
    is_default: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "cat-010",
    family_id: "fam-001",
    name: "Bisnis & Jasa",
    type: "income",
    icon: "Store",
    color: "#8b5cf6",
    is_default: true,
    created_at: "2026-01-01T00:00:00Z",
  },
];

const mockBudgets: Budget[] = [
  {
    id: "bud-001",
    family_id: "fam-001",
    category_id: "cat-001",
    target_amount: 6000000,
    period: "monthly",
    month_year: "2026-09",
    created_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "bud-002",
    family_id: "fam-001",
    category_id: "cat-002",
    target_amount: 5500000,
    period: "monthly",
    month_year: "2026-09",
    created_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "bud-003",
    family_id: "fam-001",
    category_id: "cat-003",
    target_amount: 2500000,
    period: "monthly",
    month_year: "2026-09",
    created_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "bud-004",
    family_id: "fam-001",
    category_id: "cat-004",
    target_amount: 2000000,
    period: "monthly",
    month_year: "2026-09",
    created_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "bud-005",
    family_id: "fam-001",
    category_id: "cat-005",
    target_amount: 4000000,
    period: "monthly",
    month_year: "2026-09",
    created_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "bud-006",
    family_id: "fam-001",
    category_id: "cat-006",
    target_amount: 2000000,
    period: "monthly",
    month_year: "2026-09",
    created_at: "2026-09-01T00:00:00Z",
  },
];

const mockTransactions: Transaction[] = [
  {
    id: "tx-001",
    family_id: "fam-001",
    member_id: "mem-001",
    wallet_id: "wal-001",
    category_id: "cat-008",
    type: "income",
    amount: 38500000,
    transaction_date: "2026-09-01T08:30:00Z",
    description: "Gaji Bulanan PT Teknologi Maju",
    media_type: "text",
    is_synced_gsheet: true,
    parsed_metadata: { merchant: "PT Teknologi Maju", confidence: 1.0 },
    created_at: "2026-09-01T08:30:00Z",
  },
  {
    id: "tx-002",
    family_id: "fam-001",
    member_id: "mem-002",
    wallet_id: "wal-002",
    category_id: "cat-010",
    type: "income",
    amount: 14200000,
    transaction_date: "2026-09-01T09:15:00Z",
    description: "Pembayaran Invoice Desain & Konsultasi",
    media_type: "text",
    is_synced_gsheet: true,
    parsed_metadata: { merchant: "Client Studio", confidence: 0.95 },
    created_at: "2026-09-01T09:15:00Z",
  },
  {
    id: "tx-003",
    family_id: "fam-001",
    member_id: "mem-002",
    wallet_id: "wal-002",
    category_id: "cat-002",
    type: "expense",
    amount: 1850000,
    transaction_date: "2026-09-01T11:45:00Z",
    description: "Belanja Mingguan Superindo",
    media_type: "image",
    drive_file_id: "receipts/2026/09/struk_superindo_dago.jpg",
    drive_view_url: "/api/transactions/media?id=tx-003",
    is_synced_gsheet: true,
    parsed_metadata: {
      merchant: "Superindo Dago",
      items: [
        { name: "Beras Pandan Wangi 5kg", raw_name: "BRS PANDAN WANGI 5KG", qty: 2, price: 185000 },
        { name: "Minyak Goreng 2L", raw_name: "MYK GRNG 2L", qty: 3, price: 105000 },
        { name: "Daging Sapi Segar 1kg", raw_name: "DGG SAPI SGR 1KG", qty: 2, price: 280000 },
        { name: "Buah & Sayur Segar", raw_name: "BUAH & SAYUR SEGAR", qty: 1, price: 390000 },
        { name: "Sari Roti Sandwich To Go Rasa Black Cokelat 128g", raw_name: "SR.TOGO BLACK 128GR", qty: 1, price: 14000 },
        { name: "Biskuit Biskuat Energi Golden Vanilla 105g", raw_name: "BISKUAT GLDN VNL 105", qty: 1, price: 16000 },
        { name: "Indomilk Susu Kental Manis Putih (SKMP) Kemasan Pouch (S)", raw_name: "INDOMILK SKMP POUCH S", qty: 10, price: 18500 },
      ],
      confidence: 0.98,
    },
    created_at: "2026-09-01T11:45:00Z",
  },
  {
    id: "tx-004",
    family_id: "fam-001",
    member_id: "mem-001",
    wallet_id: "wal-003",
    category_id: "cat-003",
    type: "expense",
    amount: 450000,
    transaction_date: "2026-09-01T14:20:00Z",
    description: "Isi Bensin Pertamax Turbo HR-V",
    media_type: "text",
    is_synced_gsheet: true,
    parsed_metadata: { merchant: "SPBU Pertamina 31.123", confidence: 0.95 },
    created_at: "2026-09-01T14:20:00Z",
  },
  {
    id: "tx-005",
    family_id: "fam-001",
    member_id: "mem-001",
    wallet_id: "wal-001",
    category_id: "cat-004",
    type: "expense",
    amount: 1450000,
    transaction_date: "2026-09-01T16:00:00Z",
    description: "Tagihan Listrik PLN Pasca Bayar",
    media_type: "text",
    is_synced_gsheet: true,
    parsed_metadata: { merchant: "PLN", confidence: 0.99 },
    created_at: "2026-09-01T16:00:00Z",
  },
  {
    id: "tx-006",
    family_id: "fam-001",
    member_id: "mem-003",
    wallet_id: "wal-003",
    category_id: "cat-001",
    type: "expense",
    amount: 320000,
    transaction_date: "2026-09-01T19:30:00Z",
    description: "Makan Malam Keluarga Resto Padang",
    media_type: "image",
    is_synced_gsheet: true,
    parsed_metadata: {
      merchant: "Restoran Sederhana",
      items: [
        { name: "Paket Ayam Pop & Gulai", qty: 4, price: 240000 },
        { name: "Jus Alpukat & Es Jeruk", qty: 4, price: 80000 },
      ],
      confidence: 0.96,
    },
    created_at: "2026-09-01T19:30:00Z",
  },
  {
    id: "tx-007",
    family_id: "fam-001",
    member_id: "mem-002",
    wallet_id: "wal-004",
    category_id: "cat-005",
    type: "expense",
    amount: 2500000,
    transaction_date: "2026-08-28T10:00:00Z",
    description: "SPP & Buku Paket Sekolah Anak",
    media_type: "text",
    is_synced_gsheet: true,
    parsed_metadata: { merchant: "Yayasan Sekolah Islam", confidence: 0.95 },
    created_at: "2026-08-28T10:00:00Z",
  },
  {
    id: "tx-008",
    family_id: "fam-001",
    member_id: "mem-001",
    wallet_id: "wal-001",
    category_id: "cat-006",
    type: "expense",
    amount: 850000,
    transaction_date: "2026-08-25T15:00:00Z",
    description: "Tiket Bioskop & Rekreasi Akhir Pekan",
    media_type: "text",
    is_synced_gsheet: true,
    parsed_metadata: { merchant: "Cinema XXI", confidence: 0.92 },
    created_at: "2026-08-25T15:00:00Z",
  },
  {
    id: "tx-009",
    family_id: "fam-001",
    member_id: "mem-001",
    wallet_id: "wal-001",
    category_id: "cat-008",
    type: "income",
    amount: 38500000,
    transaction_date: "2026-08-01T08:30:00Z",
    description: "Gaji Bulanan Agustus",
    media_type: "text",
    is_synced_gsheet: true,
    parsed_metadata: { merchant: "PT Teknologi Maju", confidence: 1.0 },
    created_at: "2026-08-01T08:30:00Z",
  },
  {
    id: "tx-010",
    family_id: "fam-001",
    member_id: "mem-001",
    wallet_id: "wal-001",
    category_id: "cat-008",
    type: "income",
    amount: 38500000,
    transaction_date: "2026-07-01T08:30:00Z",
    description: "Gaji Bulanan Juli",
    media_type: "text",
    is_synced_gsheet: true,
    parsed_metadata: { merchant: "PT Teknologi Maju", confidence: 1.0 },
    created_at: "2026-07-01T08:30:00Z",
  },
];

const mockAssets: Asset[] = [
  {
    id: "ast-001",
    family_id: "fam-001",
    name: "Rumah Tinggal Utama (Cluster BSD)",
    category: "real_estate",
    estimated_value: 1450000000,
    acquisition_date: "2021-06-15",
    notes: "SHM Luas Tanah 120m2 / Bangunan 90m2",
    metadata: { location: "BSD City, Tangerang Selatan" },
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "ast-002",
    family_id: "fam-001",
    name: "Mobil Honda HR-V 1.5 SE CVT",
    category: "vehicle",
    estimated_value: 320000000,
    acquisition_date: "2023-03-20",
    notes: "Plat B 1234 FNR, servis rutin dealer resmi",
    metadata: { color: "Platinum White Pearl", year: 2023 },
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "ast-003",
    family_id: "fam-001",
    name: "Logam Mulia Antam (50 Gram)",
    category: "gold",
    estimated_value: 72500000,
    acquisition_date: "2022-11-10",
    notes: "Sertifikat Certicard di Brankas Rumah",
    metadata: { purity: "99.99%" },
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "ast-004",
    family_id: "fam-001",
    name: "Portofolio Saham Blue Chip (BBCA & BBRI)",
    category: "investment",
    estimated_value: 125000000,
    acquisition_date: "2020-05-01",
    notes: "Dividen rutin tahunan di Rekening Sekuritas",
    metadata: { broker: "Mandiri Sekuritas" },
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "ast-005",
    family_id: "fam-001",
    name: "MacBook Pro 14 M3 Pro",
    category: "electronics",
    estimated_value: 28000000,
    acquisition_date: "2024-02-15",
    notes: "Aset produktif kerja Ayah",
    metadata: { serial: "C02XYZ1234" },
    created_at: "2026-01-01T00:00:00Z",
  },
];

const mockLiabilities: Liability[] = [
  {
    id: "lia-001",
    family_id: "fam-001",
    name: "KPR Rumah BSD (BTN Syariah)",
    type: "mortgage",
    total_amount: 850000000,
    remaining_amount: 420000000,
    monthly_installment: 6850000,
    interest_rate_percent: 7.2,
    due_date_day: 10,
    start_date: "2021-07-01",
    end_date: "2031-07-01",
    notes: "Autodebit dari rekening BCA Utama",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "lia-002",
    family_id: "fam-001",
    name: "Cicilan Mobil HR-V (BCA Finance)",
    type: "vehicle_loan",
    total_amount: 240000000,
    remaining_amount: 65000000,
    monthly_installment: 5400000,
    interest_rate_percent: 3.8,
    due_date_day: 25,
    start_date: "2023-04-01",
    end_date: "2027-04-01",
    notes: "Tenor 4 tahun, sisa 12 bulan",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "lia-003",
    family_id: "fam-001",
    name: "Kartu Kredit BCA Everyday Card",
    type: "credit_card",
    total_amount: 15000000,
    remaining_amount: 4250000,
    monthly_installment: 4250000,
    interest_rate_percent: 1.75,
    due_date_day: 5,
    start_date: "2026-08-01",
    end_date: null,
    notes: "Tagihan belanja bulanan, dilunasi full payment tiap bulan",
    created_at: "2026-01-01T00:00:00Z",
  },
];

const mockDocuments: LegalDocument[] = [
  {
    id: "doc-001",
    family_id: "fam-001",
    member_id: "mem-001",
    title: "KTP Elektronik Ayah",
    category: "identity",
    document_number: "3275011204900001",
    drive_file_id: "mock_drive_ktp_ayah",
    drive_view_url: "https://drive.google.com",
    expiry_date: null,
    reminder_days_before: 30,
    metadata: { status: "permanent", notes: "Berlaku Seumur Hidup" },
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "doc-002",
    family_id: "fam-001",
    member_id: "mem-002",
    title: "KTP Elektronik Ibu",
    category: "identity",
    document_number: "3275015508920002",
    drive_file_id: "mock_drive_ktp_ibu",
    drive_view_url: "https://drive.google.com",
    expiry_date: null,
    reminder_days_before: 30,
    metadata: { status: "permanent", notes: "Berlaku Seumur Hidup" },
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "doc-003",
    family_id: "fam-001",
    member_id: null,
    title: "Kartu Keluarga (KK) F&R",
    category: "identity",
    document_number: "3275010901220005",
    drive_file_id: "mock_drive_kk",
    drive_view_url: "https://drive.google.com",
    expiry_date: null,
    reminder_days_before: 30,
    metadata: { status: "permanent" },
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "doc-004",
    family_id: "fam-001",
    member_id: "mem-001",
    title: "Paspor RI Ayah (E-Paspor)",
    category: "identity",
    document_number: "X1928374",
    drive_file_id: "mock_drive_paspor_ayah",
    drive_view_url: "https://drive.google.com",
    expiry_date: "2026-09-26",
    reminder_days_before: 60,
    metadata: { notes: "Segera perpanjang di Kantor Imigrasi" },
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "doc-005",
    family_id: "fam-001",
    member_id: null,
    title: "STNK Mobil Honda HR-V",
    category: "vehicle",
    document_number: "09182374/STNK/2023",
    drive_file_id: "mock_drive_stnk_hrv",
    drive_view_url: "https://drive.google.com",
    expiry_date: "2026-09-15",
    reminder_days_before: 30,
    metadata: { notes: "Pajak tahunan 1 tahunan Samsat BSD" },
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "doc-006",
    family_id: "fam-001",
    member_id: null,
    title: "Sertifikat Hak Milik (SHM) Rumah BSD",
    category: "property",
    document_number: "SHM-No.8891/BSD",
    drive_file_id: "mock_drive_shm",
    drive_view_url: "https://drive.google.com",
    expiry_date: null,
    reminder_days_before: 30,
    metadata: { status: "permanent", notes: "Disimpan di Deposit Box BTN Syariah" },
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "doc-007",
    family_id: "fam-001",
    member_id: null,
    title: "Polis Asuransi Kesehatan Prudential Family",
    category: "insurance",
    document_number: "POL-PRU-992019",
    drive_file_id: "mock_drive_polis",
    drive_view_url: "https://drive.google.com",
    expiry_date: "2027-01-01",
    reminder_days_before: 30,
    metadata: { notes: "Premi tahunan autodebit Januari" },
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "doc-008",
    family_id: "fam-001",
    member_id: "mem-001",
    title: "NPWP Keluarga",
    category: "tax",
    document_number: "09.876.543.2-123.000",
    drive_file_id: "mock_drive_npwp",
    drive_view_url: "https://drive.google.com",
    expiry_date: null,
    reminder_days_before: 30,
    metadata: { status: "permanent" },
    created_at: "2026-01-01T00:00:00Z",
  },
];

const mockLogs: ChatActivityLog[] = [
  {
    id: "log-001",
    family_id: "fam-001",
    channel: "telegram",
    chat_id: "123456789",
    sender_name: "Ayah (Fatih)",
    input_type: "image",
    raw_prompt: "Foto struk belanja Superindo 1.850.000 via Mandiri",
    status: "success",
    ai_model: "Gemini 2.5 Flash",
    latency_ms: 1820,
    parsed_metadata: {
      merchant: "Superindo Dago",
      total: 1850000,
      wallet: "Mandiri Operasional",
      category: "Supermarket & Sembako",
    },
    transaction_id: "tx-003",
    created_at: "2026-09-01T11:45:00Z",
    completed_at: "2026-09-01T11:45:02Z",
  },
  {
    id: "log-002",
    family_id: "fam-001",
    channel: "telegram",
    chat_id: "123456789",
    sender_name: "Ayah (Fatih)",
    input_type: "text",
    raw_prompt: "Isi bensin 450rb gopay",
    status: "success",
    ai_model: "Gemini 2.5 Flash",
    latency_ms: 940,
    parsed_metadata: {
      amount: 450000,
      category: "Transportasi & Bensin",
      wallet: "GoPay Family",
    },
    transaction_id: "tx-004",
    created_at: "2026-09-01T14:20:00Z",
    completed_at: "2026-09-01T14:20:01Z",
  },
  {
    id: "log-003",
    family_id: "fam-001",
    channel: "telegram",
    chat_id: "987654321",
    sender_name: "Ibu (Rania)",
    input_type: "text",
    raw_prompt: "Masuk honor desain 14.2jt ke mandiri",
    status: "success",
    ai_model: "Gemini 2.5 Flash",
    latency_ms: 1100,
    parsed_metadata: {
      amount: 14200000,
      type: "income",
      wallet: "Mandiri Operasional",
    },
    transaction_id: "tx-002",
    created_at: "2026-09-01T09:15:00Z",
    completed_at: "2026-09-01T09:15:01Z",
  },
  {
    id: "log-004",
    family_id: "fam-001",
    channel: "whatsapp",
    chat_id: "6281234567890",
    sender_name: "Ayah (Fatih)",
    input_type: "audio",
    raw_prompt: "Pesan suara: 'Catat bayar listrik 1.45jt dari BCA'",
    status: "success",
    ai_model: "Gemini 2.5 Flash",
    latency_ms: 2450,
    parsed_metadata: {
      amount: 1450000,
      category: "Listrik & Air Utilitas",
      wallet: "BCA Prioritas",
    },
    transaction_id: "tx-005",
    created_at: "2026-09-01T16:00:00Z",
    completed_at: "2026-09-01T16:00:02Z",
  },
];

// Global in-memory singleton store
class MockDataStore {
  private static instance: MockDataStore;
  private data: MockStore;

  private constructor() {
    this.data = {
      family: { ...mockFamily },
      members: [...mockMembers],
      wallets: [...mockWallets],
      categories: [...mockCategories],
      budgets: [...mockBudgets],
      transactions: [...mockTransactions],
      assets: [...mockAssets],
      liabilities: [...mockLiabilities],
      documents: [...mockDocuments],
      logs: [...mockLogs],
    };
  }

  public static getInstance(): MockDataStore {
    if (!MockDataStore.instance) {
      MockDataStore.instance = new MockDataStore();
    }
    return MockDataStore.instance;
  }

  // Families
  public getFamily() {
    return this.data.family;
  }

  // Wallets
  public getWallets() {
    return [...this.data.wallets];
  }
  public addWallet(w: Partial<Wallet>) {
    const newWallet: Wallet = {
      id: `wal-${Date.now()}`,
      family_id: this.data.family.id,
      name: w.name || "Rekening Baru",
      type: w.type || "bank",
      current_balance: Number(w.current_balance || 0),
      currency: w.currency || "IDR",
      account_number: w.account_number || "-",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.wallets.unshift(newWallet);
    return newWallet;
  }
  public updateWallet(id: string, updates: Partial<Wallet>) {
    const idx = this.data.wallets.findIndex((w) => w.id === id);
    if (idx !== -1) {
      this.data.wallets[idx] = {
        ...this.data.wallets[idx],
        ...updates,
        current_balance:
          updates.current_balance !== undefined
            ? Number(updates.current_balance)
            : this.data.wallets[idx].current_balance,
        updated_at: new Date().toISOString(),
      };
      return this.data.wallets[idx];
    }
    return null;
  }
  public deleteWallet(id: string) {
    this.data.wallets = this.data.wallets.filter((w) => w.id !== id);
    return true;
  }

  // Categories
  public getCategories() {
    return [...this.data.categories];
  }
  public addCategory(cat: {
    name: string;
    type?: "income" | "expense";
    color?: string;
    icon?: string;
    family_id?: string;
    is_default?: boolean;
    initialTarget?: number;
    monthYear?: string;
  }) {
    const newCategory: Category = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      family_id: cat.family_id || this.data.family.id,
      name: cat.name.trim(),
      type: cat.type || "expense",
      icon: cat.icon || "Tag",
      color: cat.color || "#3b82f6",
      is_default: cat.is_default ?? false,
      created_at: new Date().toISOString(),
    };
    this.data.categories.push(newCategory);

    if (cat.initialTarget !== undefined && cat.initialTarget > 0) {
      const monthYear = cat.monthYear || new Date().toISOString().substring(0, 7);
      this.data.budgets.push({
        id: `bud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        family_id: newCategory.family_id,
        category_id: newCategory.id,
        target_amount: Number(cat.initialTarget),
        period: "monthly",
        month_year: monthYear,
        created_at: new Date().toISOString(),
      });
    }

    return newCategory;
  }
  public updateCategory(id: string, updates: Partial<Category>) {
    const idx = this.data.categories.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.categories[idx] = {
      ...this.data.categories[idx],
      ...updates,
      name: updates.name !== undefined ? updates.name.trim() : this.data.categories[idx].name,
    };
    return this.data.categories[idx];
  }
  public deleteCategory(id: string, fallbackCategoryId?: string) {
    const cat = this.data.categories.find((c) => c.id === id);
    if (!cat) return false;

    const fallbackId =
      fallbackCategoryId ||
      this.data.categories.find((c) => c.id !== id && c.type === cat.type && c.is_default)?.id ||
      this.data.categories.find((c) => c.id !== id && c.type === cat.type)?.id ||
      null;

    if (fallbackId) {
      this.data.transactions = this.data.transactions.map((t) => {
        if (t.category_id === id) {
          return { ...t, category_id: fallbackId };
        }
        return t;
      });
    }

    this.data.budgets = this.data.budgets.filter((b) => b.category_id !== id);
    this.data.categories = this.data.categories.filter((c) => c.id !== id);
    return true;
  }

  // Budgets
  public getBudgets(monthYear?: string) {
    const period = monthYear && monthYear !== "all" ? monthYear : "2026-09";
    const items = this.data.budgets.filter((b) => !monthYear || monthYear === "all" || b.month_year === period);
    return items.map((b) => ({
      ...b,
      category: this.data.categories.find((c) => c.id === b.category_id),
    }));
  }
  public setBudgets(monthYear: string, budgetItems: { categoryId: string; targetAmount: number }[]) {
    const targetPeriod = monthYear || "2026-09";
    this.data.budgets = this.data.budgets.filter((b) => b.month_year !== targetPeriod);
    budgetItems.forEach((item) => {
      this.data.budgets.push({
        id: `bud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        family_id: this.data.family.id,
        category_id: item.categoryId,
        target_amount: Number(item.targetAmount || 0),
        period: "monthly",
        month_year: targetPeriod,
        created_at: new Date().toISOString(),
      });
    });
    return this.getBudgets(targetPeriod);
  }

  // Transactions
  public getTransactions(period?: string) {
    let list = [...this.data.transactions];
    if (period && period !== "all") {
      list = list.filter((t) => {
        const d = t.transaction_date || t.created_at;
        return d && d.startsWith(period);
      });
    }
    return list.map((t) => ({
      ...t,
      wallet: this.data.wallets.find((w) => w.id === t.wallet_id),
      category: this.data.categories.find((c) => c.id === t.category_id),
      member: this.data.members.find((m) => m.id === t.member_id),
    }));
  }
  public addTransaction(t: Partial<Transaction>) {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      family_id: this.data.family.id,
      member_id: t.member_id || "mem-001",
      wallet_id: t.wallet_id || "wal-001",
      category_id: t.category_id || "cat-001",
      to_wallet_id: t.to_wallet_id || null,
      type: t.type || "expense",
      amount: Number(t.amount || 0),
      transaction_date: t.transaction_date || new Date().toISOString(),
      description: t.description || "Transaksi Baru",
      raw_prompt: t.raw_prompt || null,
      media_type: t.media_type || "text",
      is_synced_gsheet: true,
      parsed_metadata: t.parsed_metadata || {},
      created_at: new Date().toISOString(),
    };
    this.data.transactions.unshift(newTx);

    // Update wallet balance
    const wallet = this.data.wallets.find((w) => w.id === newTx.wallet_id);
    if (wallet) {
      if (newTx.type === "income") {
        wallet.current_balance += newTx.amount;
      } else if (newTx.type === "expense") {
        wallet.current_balance -= newTx.amount;
      }
    }
    return newTx;
  }
  public deleteTransaction(id: string) {
    const idx = this.data.transactions.findIndex((t) => t.id === id);
    if (idx !== -1) {
      const tx = this.data.transactions[idx];
      const wallet = this.data.wallets.find((w) => w.id === tx.wallet_id);
      if (wallet) {
        if (tx.type === "income") wallet.current_balance -= tx.amount;
        if (tx.type === "expense") wallet.current_balance += tx.amount;
      }
      this.data.transactions.splice(idx, 1);
      return true;
    }
    return false;
  }

  // Assets
  public getAssets() {
    return [...this.data.assets];
  }
  public addAsset(a: Partial<Asset>) {
    const newAsset: Asset = {
      id: `ast-${Date.now()}`,
      family_id: this.data.family.id,
      name: a.name || "Aset Baru",
      category: a.category || "other",
      estimated_value: Number(a.estimated_value || 0),
      acquisition_date: a.acquisition_date || new Date().toISOString().split("T")[0],
      notes: a.notes || "",
      metadata: a.metadata || {},
      created_at: new Date().toISOString(),
    };
    this.data.assets.unshift(newAsset);
    return newAsset;
  }
  public deleteAsset(id: string) {
    this.data.assets = this.data.assets.filter((a) => a.id !== id);
    return true;
  }

  // Liabilities
  public getLiabilities() {
    return [...this.data.liabilities];
  }
  public addLiability(l: Partial<Liability>) {
    const newLiability: Liability = {
      id: `lia-${Date.now()}`,
      family_id: this.data.family.id,
      name: l.name || "Kewajiban Baru",
      type: l.type || "other",
      total_amount: Number(l.total_amount || 0),
      remaining_amount: Number(l.remaining_amount || l.total_amount || 0),
      monthly_installment: Number(l.monthly_installment || 0),
      interest_rate_percent: l.interest_rate_percent || null,
      due_date_day: l.due_date_day || 1,
      start_date: l.start_date || new Date().toISOString().split("T")[0],
      end_date: l.end_date || null,
      notes: l.notes || "",
      created_at: new Date().toISOString(),
    };
    this.data.liabilities.unshift(newLiability);
    return newLiability;
  }
  public deleteLiability(id: string) {
    this.data.liabilities = this.data.liabilities.filter((l) => l.id !== id);
    return true;
  }

  // Documents
  public getDocuments() {
    const today = new Date();
    return this.data.documents.map((doc) => {
      let status: "active" | "expiring_soon" | "expired" | "permanent" = "active";
      if (!doc.expiry_date || doc.metadata?.status === "permanent") {
        status = "permanent";
      } else {
        const exp = new Date(doc.expiry_date);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          status = "expired";
        } else if (diffDays <= (doc.reminder_days_before || 30)) {
          status = "expiring_soon";
        }
      }
      return {
        ...doc,
        status,
        member: this.data.members.find((m) => m.id === doc.member_id),
      };
    });
  }
  public addDocument(d: Partial<LegalDocument>) {
    const newDoc: LegalDocument = {
      id: `doc-${Date.now()}`,
      family_id: this.data.family.id,
      member_id: d.member_id || null,
      title: d.title || "Dokumen Baru",
      category: d.category || "other",
      document_number: d.document_number || "",
      drive_file_id: d.drive_file_id || "mock_drive_id",
      drive_view_url: d.drive_view_url || "https://drive.google.com",
      expiry_date: d.expiry_date || null,
      reminder_days_before: d.reminder_days_before || 30,
      metadata: d.metadata || {},
      created_at: new Date().toISOString(),
    };
    this.data.documents.unshift(newDoc);
    return newDoc;
  }
  public updateDocument(id: string, d: Partial<LegalDocument>) {
    const idx = this.data.documents.findIndex((doc) => doc.id === id);
    if (idx !== -1) {
      this.data.documents[idx] = {
        ...this.data.documents[idx],
        ...d,
      };
      return this.data.documents[idx];
    }
    return null;
  }
  public deleteDocument(id: string) {
    this.data.documents = this.data.documents.filter((d) => d.id !== id);
    return true;
  }

  // Members
  public getMembers() {
    return [...this.data.members];
  }
  public addMember(m: Partial<FamilyMember>) {
    const newMem: FamilyMember = {
      id: `mem-${Date.now()}`,
      family_id: this.data.family.id,
      full_name: m.full_name || "Anggota Baru",
      role: m.role || "member",
      default_wallet_id: m.default_wallet_id || "wal-001",
      telegram_chat_id: m.telegram_chat_id || null,
      whatsapp_number: m.whatsapp_number || null,
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    this.data.members.push(newMem);
    return newMem;
  }
  public updateMember(id: string, m: Partial<FamilyMember>) {
    const idx = this.data.members.findIndex((mem) => mem.id === id);
    if (idx !== -1) {
      this.data.members[idx] = {
        ...this.data.members[idx],
        ...m,
      };
      return this.data.members[idx];
    }
    return null;
  }
  public deleteMember(id: string) {
    this.data.members = this.data.members.filter((m) => m.id !== id);
    return true;
  }

  // Logs
  public getLogs() {
    return [...this.data.logs];
  }
  public addLog(l: Partial<ChatActivityLog>) {
    const newLog: ChatActivityLog = {
      id: `log-${Date.now()}`,
      family_id: this.data.family.id,
      channel: l.channel || "telegram",
      chat_id: l.chat_id || "123456789",
      sender_name: l.sender_name || "User",
      input_type: l.input_type || "text",
      raw_prompt: l.raw_prompt || "",
      status: l.status || "success",
      ai_model: l.ai_model || "Gemini 2.5 Flash",
      latency_ms: l.latency_ms || 850,
      parsed_metadata: l.parsed_metadata || null,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
    this.data.logs.unshift(newLog);
    return newLog;
  }
}

// Global singleton attached to globalThis to persist mock data across Next.js API chunks in local dev
const globalForMock = globalThis as unknown as {
  mockDataStoreInstance?: MockDataStore;
};

if (globalForMock.mockDataStoreInstance) {
  Object.setPrototypeOf(globalForMock.mockDataStoreInstance, MockDataStore.prototype);
}

export const mockStore =
  globalForMock.mockDataStoreInstance || MockDataStore.getInstance();
globalForMock.mockDataStoreInstance = mockStore;
