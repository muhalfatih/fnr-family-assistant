# 📖 Glosarium Domain & Model Data (Domain Modeling)

Dokumen ini mendefinisikan bahasa bersama (*Ubiquitous Language*) dan pemodelan entitas untuk sistem **F&R Family Hub**.

---

## 1. Glosarium Domain (Ubiquitous Language)

| Istilah | Definisi |
| :--- | :--- |
| **Family (Keluarga)** | Unit tenant utama dalam sistem. Seluruh data keuangan, anggaran, aset, dan dokumen terikat pada satu `family_id`. |
| **Family Member** | Anggota keluarga yang memiliki peran (`admin` = Ayah/Ibu, `member` = Anak/Lainnya), terhubung dengan identitas Telegram/WhatsApp, serta memiliki `default_wallet_id`. |
| **Wallet / Account (Dompet/Rekening)** | Wadah saldo keuangan nyata (contoh: Rekening BCA, Saldo Tunai Dompet, Gopay, OVO, Bibit). |
| **Default Wallet Fallback** | Kebijakan sistem yang otomatis mengalokasikan transaksi ke dompet utama milik anggota keluarga yang mengirim pesan jika nama dompet tidak disebutkan di chat. |
| **Category (Kategori)** | Klasifikasi pos transaksi (contoh: `Makanan & Minuman`, `Tagihan Utilitas`, `Bensin/Transport`, `Gaji`). |
| **Transaction (Transaksi)** | Setiap pergerakan arus kas: `income` (pemasukan), `expense` (pengeluaran), atau `transfer` (pindah dana antar-dompet). |
| **Budget (Rencana Anggaran)** | Batas alokasi pengeluaran per kategori untuk periode tertentu (biasanya per bulan kalender). |
| **Google Drive Media Storage** | Mekanisme penyimpanan berkas foto nota belanja dan dokumen legal ke Google Drive Shared Folder keluarga melalui Google Service Account. |
| **Real-Time Sheets Sync** | Proses replikasi instan setiap baris transaksi yang baru tersimpan langsung ke Google Spreadsheet keluarga. |
| **Asset (Aset)** | Barang berharga atau instrumen bernilai milik keluarga (Rumah, Kendaraan, Logam Mulia, Portofolio Saham). |
| **Liability (Hutang/Kewajiban)** | Kewajiban pembayaran berkala atau pinjaman (KPR, Kredit Kendaraan, Hutang Piutang). |
| **Property Utility** | Layanan rutin rumah tangga yang memiliki tanggal jatuh tempo dan nomor pelanggan (PLN Token/Pascabayar, PDAM, Internet Wifi, IPL). |
| **Digital Vault (Brankas Dokumen)** | Arsip berkas digital penting (KTP, Kartu Keluarga, STNK, Sertifikat) dengan pengingat masa berlaku otomatis. |
| **Multimodal Ingestion** | Proses penerimaan input variatif (teks bebas, foto struk, suara VN) yang diterjemahkan menjadi objek transaksi terstruktur via Gemini LLM. |

---

## 2. Diagram Hubungan Entitas (ERD)

```mermaid
erDiagram
    FAMILIES ||--o{ FAMILY_MEMBERS : has
    FAMILIES ||--o{ WALLETS : owns
    FAMILIES ||--o{ CATEGORIES : configures
    FAMILIES ||--o{ BUDGETS : defines
    FAMILIES ||--o{ TRANSACTIONS : logs
    FAMILIES ||--o{ ASSETS : tracks
    FAMILIES ||--o{ LIABILITIES : manages
    FAMILIES ||--o{ PROPERTY_UTILITIES : pays
    FAMILIES ||--o{ DOCUMENTS : stores

    FAMILY_MEMBERS ||--o{ TRANSACTIONS : creates
    WALLETS ||--o{ TRANSACTIONS : records
    CATEGORIES ||--o{ TRANSACTIONS : classifies
    CATEGORIES ||--o{ BUDGETS : sets_target
    
    FAMILIES {
        uuid id PK
        string name
        string currency
        string google_drive_folder_id
        string google_sheets_spreadsheet_id
        jsonb settings
        timestamp created_at
    }

    FAMILY_MEMBERS {
        uuid id PK
        uuid family_id FK
        string full_name
        string role "admin | member"
        uuid default_wallet_id FK
        bigint telegram_chat_id
        string whatsapp_number
        timestamp created_at
    }

    WALLETS {
        uuid id PK
        uuid family_id FK
        string name
        string type "bank | ewallet | cash | investment | credit_card"
        numeric current_balance
        string currency
        boolean is_active
    }

    CATEGORIES {
        uuid id PK
        uuid family_id FK
        string name
        string type "income | expense"
        string icon
        string color
    }

    BUDGETS {
        uuid id PK
        uuid family_id FK
        uuid category_id FK
        numeric target_amount
        string period "monthly"
        string month_year
    }

    TRANSACTIONS {
        uuid id PK
        uuid family_id FK
        uuid member_id FK
        uuid wallet_id FK
        uuid category_id FK
        uuid to_wallet_id FK "nullable for transfer"
        string type "income | expense | transfer"
        numeric amount
        timestamp transaction_date
        text description
        string media_type "text | image | audio"
        string drive_file_id
        string drive_view_url
        boolean is_synced_gsheet
        jsonb parsed_metadata
    }

    DOCUMENTS {
        uuid id PK
        uuid family_id FK
        uuid member_id FK
        string title
        string category
        string drive_file_id
        string drive_view_url
        date expiry_date
        int reminder_days_before
    }
```
