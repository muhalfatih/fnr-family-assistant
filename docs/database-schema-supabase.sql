-- ==============================================================================
-- F&R Family Hub — Supabase Database Schema (PostgreSQL DDL)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. FAMILIES
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL DEFAULT 'Keluarga Bahagia',
    currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
    google_drive_folder_id VARCHAR(255),
    google_sheets_spreadsheet_id VARCHAR(255),
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. WALLETS / ACCOUNTS
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'cash' CHECK (type IN ('bank', 'ewallet', 'cash', 'investment', 'credit_card')),
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
    account_number VARCHAR(50),
    icon VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. FAMILY MEMBERS
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    auth_user_id UUID, -- Supabase Auth User UID
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    default_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    telegram_chat_id BIGINT UNIQUE,
    whatsapp_number VARCHAR(50),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    icon VARCHAR(50) DEFAULT 'Tag',
    color VARCHAR(20) DEFAULT '#3b82f6',
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. BUDGETS
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    target_amount NUMERIC(15, 2) NOT NULL,
    period VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'yearly')),
    month_year VARCHAR(7) NOT NULL, -- e.g. '2026-08'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(family_id, category_id, month_year)
);

-- 6. TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    to_wallet_id UUID REFERENCES public.wallets(id) ON DELETE RESTRICT, -- For 'transfer' type
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount NUMERIC(15, 2) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    description TEXT,
    raw_prompt TEXT, -- Original chat / transcription
    media_type VARCHAR(20) DEFAULT 'text' CHECK (media_type IN ('text', 'image', 'audio')),
    media_url TEXT, -- Fallback URL
    drive_file_id VARCHAR(255), -- Google Drive file ID
    drive_view_url TEXT, -- Google Drive webViewLink
    is_synced_gsheet BOOLEAN NOT NULL DEFAULT false, -- Real-time sync flag
    parsed_metadata JSONB DEFAULT '{}'::jsonb, -- AI breakdown details & itemized receipts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. ASSETS
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('real_estate', 'vehicle', 'gold', 'electronics', 'investment', 'other')),
    estimated_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    acquisition_date DATE,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. LIABILITIES & DEBTS
CREATE TABLE IF NOT EXISTS public.liabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('mortgage', 'vehicle_loan', 'personal_loan', 'credit_card', 'other')),
    total_amount NUMERIC(15, 2) NOT NULL,
    remaining_amount NUMERIC(15, 2) NOT NULL,
    monthly_installment NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    interest_rate_percent NUMERIC(5, 2) DEFAULT 0.00,
    due_date_day INT CHECK (due_date_day BETWEEN 1 AND 31),
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. PROPERTY & UTILITIES
CREATE TABLE IF NOT EXISTS public.property_utilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    provider VARCHAR(100),
    customer_number VARCHAR(100),
    due_date_day INT CHECK (due_date_day BETWEEN 1 AND 31),
    estimated_cost NUMERIC(15, 2) DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. DIGITAL VAULT / LEGAL DOCUMENTS
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('identity', 'vehicle', 'property', 'insurance', 'tax', 'health', 'other')),
    document_number VARCHAR(100),
    drive_file_id VARCHAR(255),
    drive_view_url TEXT,
    file_path TEXT,
    expiry_date DATE,
    reminder_days_before INT DEFAULT 30,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. BOT AUDIT & INGESTION LOGS
CREATE TABLE IF NOT EXISTS public.bot_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('telegram', 'whatsapp')),
    sender_id VARCHAR(100) NOT NULL,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('text', 'image', 'audio')),
    raw_content TEXT,
    ai_response JSONB,
    status VARCHAR(30) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'clarification_needed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_activity_logs (
    id VARCHAR(100) PRIMARY KEY,
    family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('telegram', 'whatsapp', 'web')),
    chat_id VARCHAR(100),
    sender_name VARCHAR(150) NOT NULL,
    input_type VARCHAR(20) NOT NULL CHECK (input_type IN ('text', 'image', 'audio', 'command')),
    raw_prompt TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'processing',
    error_message TEXT,
    ai_model VARCHAR(50),
    latency_ms INT,
    parsed_metadata JSONB DEFAULT '{}'::jsonb,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_transactions_family_date ON public.transactions(family_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_family_members_tg ON public.family_members(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_family_members_wa ON public.family_members(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_budgets_lookup ON public.budgets(family_id, month_year);

-- ==============================================================================
-- AUTO-UPDATE WALLET BALANCE TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_wallet_balance_change()
-- Trigger updates wallet balance dynamically upon insert/delete of transactions
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.type = 'expense' THEN
            UPDATE public.wallets SET current_balance = current_balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_id;
        ELSIF NEW.type = 'income' THEN
            UPDATE public.wallets SET current_balance = current_balance + NEW.amount, updated_at = now() WHERE id = NEW.wallet_id;
        ELSIF NEW.type = 'transfer' AND NEW.to_wallet_id IS NOT NULL THEN
            UPDATE public.wallets SET current_balance = current_balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_id;
            UPDATE public.wallets SET current_balance = current_balance + NEW.amount, updated_at = now() WHERE id = NEW.to_wallet_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.type = 'expense' THEN
            UPDATE public.wallets SET current_balance = current_balance + OLD.amount, updated_at = now() WHERE id = OLD.wallet_id;
        ELSIF OLD.type = 'income' THEN
            UPDATE public.wallets SET current_balance = current_balance - OLD.amount, updated_at = now() WHERE id = OLD.wallet_id;
        ELSIF OLD.type = 'transfer' AND OLD.to_wallet_id IS NOT NULL THEN
            UPDATE public.wallets SET current_balance = current_balance + OLD.amount, updated_at = now() WHERE id = OLD.wallet_id;
            UPDATE public.wallets SET current_balance = current_balance - OLD.amount, updated_at = now() WHERE id = OLD.to_wallet_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_wallet_balance ON public.transactions;
CREATE TRIGGER trigger_update_wallet_balance
AFTER INSERT OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_wallet_balance_change();
