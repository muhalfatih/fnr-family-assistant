export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type FamilyRole = 'admin' | 'member';
export type WalletType = 'bank' | 'ewallet' | 'cash' | 'investment' | 'credit_card';
export type CategoryType = 'income' | 'expense';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type MediaType = 'text' | 'image' | 'audio';
export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';
export type AssetCategory = 'real_estate' | 'vehicle' | 'gold' | 'electronics' | 'investment' | 'other';
export type LiabilityType = 'mortgage' | 'vehicle_loan' | 'personal_loan' | 'credit_card' | 'other';
export type DocumentCategory = 'identity' | 'vehicle' | 'property' | 'insurance' | 'tax' | 'health' | 'other';

export interface Family {
  id: string;
  name: string;
  currency: string;
  google_drive_folder_id?: string | null;
  google_sheets_spreadsheet_id?: string | null;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  auth_user_id?: string | null;
  full_name: string;
  role: FamilyRole;
  default_wallet_id?: string | null;
  telegram_chat_id?: number | null;
  whatsapp_number?: string | null;
  avatar_url?: string | null;
  created_at: string;
}

export interface Wallet {
  id: string;
  family_id: string;
  name: string;
  type: WalletType;
  current_balance: number;
  currency: string;
  account_number?: string | null;
  icon?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  family_id: string;
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  parent_id?: string | null;
  is_default: boolean;
  created_at: string;
}

export interface Budget {
  id: string;
  family_id: string;
  category_id: string;
  target_amount: number;
  period: BudgetPeriod;
  month_year: string;
  created_at: string;
  category?: Category;
}

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
}

export interface TransactionMetadata {
  merchant?: string | null;
  items?: ReceiptItem[];
  confidence?: number;
  confidence_reason?: string;
  drive_file_id?: string | null;
  drive_view_url?: string | null;
  voice_duration_sec?: number;
  original_transcription?: string;
  [key: string]: any;
}

export interface Transaction {
  id: string;
  family_id: string;
  member_id?: string | null;
  wallet_id: string;
  category_id?: string | null;
  to_wallet_id?: string | null;
  type: TransactionType;
  amount: number;
  transaction_date: string;
  description?: string | null;
  raw_prompt?: string | null;
  media_type: MediaType;
  media_url?: string | null;
  drive_file_id?: string | null;
  drive_view_url?: string | null;
  is_synced_gsheet: boolean;
  parsed_metadata: TransactionMetadata;
  created_at: string;
  
  // Relations
  member?: FamilyMember | null;
  wallet?: Wallet | null;
  to_wallet?: Wallet | null;
  category?: Category | null;
}

export interface Asset {
  id: string;
  family_id: string;
  name: string;
  category: AssetCategory;
  estimated_value: number;
  acquisition_date?: string | null;
  notes?: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Liability {
  id: string;
  family_id: string;
  name: string;
  type: LiabilityType;
  total_amount: number;
  remaining_amount: number;
  monthly_installment: number;
  interest_rate_percent?: number | null;
  due_date_day?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface PropertyUtility {
  id: string;
  family_id: string;
  name: string;
  provider?: string | null;
  customer_number?: string | null;
  due_date_day?: number | null;
  estimated_cost: number;
  is_active: boolean;
  created_at: string;
}

export interface LegalDocument {
  id: string;
  family_id: string;
  member_id?: string | null;
  title: string;
  category: DocumentCategory;
  document_number?: string | null;
  drive_file_id?: string | null;
  drive_view_url?: string | null;
  file_path?: string | null;
  expiry_date?: string | null;
  reminder_days_before: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface BotLog {
  id: string;
  family_id?: string | null;
  channel: 'telegram' | 'whatsapp';
  sender_id: string;
  message_type: MediaType;
  raw_content?: string | null;
  ai_response?: Record<string, any> | null;
  status: 'success' | 'failed' | 'clarification_needed';
  created_at: string;
}
